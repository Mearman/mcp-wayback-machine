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
 * - RATE_LIMIT_DO: Durable Object for cross-request rate limiting
 * - WAYBACK_ACCESS_KEY: optional IA S3 credentials
 * - WAYBACK_SECRET_KEY: optional IA S3 credentials
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./server.ts";
import { CachingFetcher } from "./utils/cache.ts";
import { KvCacheBackend } from "./utils/cache-kv.ts";
import { HttpError } from "./utils/http.ts";
import { DurableObjectRateLimiter } from "./utils/rate-limit-do.ts";
import type { RateLimitBackend } from "./utils/rate-limit.ts";
import { StaticTokenAuthProvider } from "./auth/provider.ts";
import type { AuthProvider } from "./auth/provider.ts";
import type { ToolContext } from "./tools/context.ts";

interface Env {
    CACHE_KV: KVNamespace;
    RATE_LIMIT_DO: DurableObjectNamespace;
    WAYBACK_ACCESS_KEY?: string;
    WAYBACK_SECRET_KEY?: string;
    MCP_AUTH_TOKEN?: string;
}

const USER_AGENT = "mcp-wayback-machine-worker";

/**
 * Durable Object ID used for rate limiting. A fixed ID ensures all
 * requests route to the same singleton DO instance.
 */
const RATE_LIMIT_DO_ID = "rate-limit";

/**
 * Build a ToolContext wired to KV-backed caching, DO-backed rate
 * limiting, and optional credentials from Worker environment bindings.
 */
function createContext(env: Env): ToolContext {
    const cacheBackend = new KvCacheBackend(env.CACHE_KV);
    const fetcher = new CachingFetcher({ backend: cacheBackend });

    // Route all rate-limit checks through a singleton Durable Object.
    // The DO maintains a shared sliding window across all Worker invocations.
    const doId = env.RATE_LIMIT_DO.idFromName(RATE_LIMIT_DO_ID);
    const doStub = env.RATE_LIMIT_DO.get(doId);
    const limiter: RateLimitBackend = new DurableObjectRateLimiter(doStub);

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
                    // Single retry after 5s for upstream rate limits
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
        const auth = createAuthProvider(env);
        const rejection = await auth.validate(request);
        if (rejection !== undefined) {
            return rejection;
        }

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

/**
 * Build the auth provider from environment bindings.
 * When MCP_AUTH_TOKEN is set, requires a matching Bearer token.
 * When absent, all requests are allowed (no auth).
 */
function createAuthProvider(env: Env): AuthProvider {
    if (env.MCP_AUTH_TOKEN !== undefined && env.MCP_AUTH_TOKEN !== "") {
        return new StaticTokenAuthProvider(env.MCP_AUTH_TOKEN);
    }
    return noAuthProvider;
}

/** No-op provider that allows all requests. */
const noAuthProvider: AuthProvider = {
    async validate() {
        return undefined;
    },
};
