/**
 * Cloudflare Worker entry point for the MCP Wayback Machine server.
 *
 * Uses the SDK's WebStandardStreamableHTTPServerTransport which accepts
 * standard Request objects and returns standard Responses — the exact
 * Worker fetch handler signature. Runs in stateless mode (no session ID)
 * so each request is independent and cold starts are handled gracefully.
 *
 * Bindings (wrangler.toml):
 * - CACHE_KV: Workers KV namespace for response caching
 * - WAYBACK_ACCESS_KEY: optional IA S3 credentials
 * - WAYBACK_SECRET_KEY: optional IA S3 credentials
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./server.ts";
import { CachingFetcher } from "./utils/cache.ts";
import { KvCacheBackend } from "./utils/cache-kv.ts";
import { HttpError } from "./utils/http.ts";
import { RateLimiter } from "./utils/rate-limit.ts";
import type { ToolContext } from "./tools/context.ts";

interface Env {
    CACHE_KV: KVNamespace;
    WAYBACK_ACCESS_KEY?: string;
    WAYBACK_SECRET_KEY?: string;
}

const USER_AGENT = "mcp-wayback-machine-worker";

/**
 * Build a ToolContext wired to KV-backed caching, rate limiting, and
 * optional credentials from Worker environment bindings.
 */
function createContext(env: Env): ToolContext {
    const backend = new KvCacheBackend(env.CACHE_KV);
    const fetcher = new CachingFetcher({ backend });
    const limiter = new RateLimiter({ maxRequests: 15, windowMs: 60000 });

    const credentials =
        env.WAYBACK_ACCESS_KEY !== undefined &&
        env.WAYBACK_SECRET_KEY !== undefined
            ? { accessKey: env.WAYBACK_ACCESS_KEY, secretKey: env.WAYBACK_SECRET_KEY }
            : undefined;

    function buildHeaders(
        url: string,
        overrides?: Record<string, string>
    ): Record<string, string> {
        const headers: Record<string, string> = {
            "User-Agent": USER_AGENT,
            ...overrides,
        };

        if (credentials !== undefined && isWaybackSaveUrl(url)) {
            headers.Authorization = `LOW ${credentials.accessKey}:${credentials.secretKey}`;
        }

        return headers;
    }

    return {
        async fetch(url, options) {
            await limiter.acquire();
            const headers = buildHeaders(url, options?.headers);

            try {
                return await fetcher.fetch(url, {
                    ...options,
                    headers,
                });
            } catch (error) {
                if (
                    error instanceof HttpError &&
                    (error.status === 429 || error.status === 498)
                ) {
                    // Single retry after 5s for rate limits
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    return fetcher.fetch(url, { ...options, headers });
                }
                throw error;
            }
        },

        async fetchJSON(url, schema) {
            const response = await this.fetch(url);
            const text = await response.text();
            const parsed: unknown = JSON.parse(text);
            return schema.parse(parsed);
        },
    };
}

function isWaybackSaveUrl(url: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return false;
    }
    if (parsed.hostname !== "web.archive.org") {
        return false;
    }
    return parsed.pathname === "/save" || parsed.pathname.startsWith("/save/");
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const transport = new WebStandardStreamableHTTPServerTransport({
            // No sessionIdGenerator — stateless mode. Each request is independent
            // so cold starts don't break sessions.
            enableJsonResponse: true,
        });

        const ctx = createContext(env);
        const server: McpServer = createServer(ctx);

        try {
            await server.connect(transport);
            return await transport.handleRequest(request);
        } catch (error) {
            return new Response(
                JSON.stringify({
                    jsonrpc: "2.0",
                    error: {
                        code: -32603,
                        message:
                            error instanceof Error
                                ? error.message
                                : "Internal server error",
                    },
                    id: null,
                }),
                {
                    status: 500,
                    headers: { "content-type": "application/json" },
                }
            );
        }
    },
} satisfies ExportedHandler<Env>;
