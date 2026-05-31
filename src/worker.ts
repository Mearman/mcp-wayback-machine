/**
 * Cloudflare Worker entry point for the MCP Wayback Machine server.
 *
 * Uses the SDK's WebStandardStreamableHTTPServerTransport which accepts
 * standard Request objects and returns standard Responses — the exact
 * Worker fetch handler signature. Runs in stateless mode (no session ID)
 * so each request is independent and cold starts are handled gracefully.
 *
 * All persistent state uses the Cache API (caches) which has no published
 * daily limits on the free tier. No KV or Durable Object bindings required.
 *
 * Authentication:
 * - MCP_AUTH_TOKEN env var: optional bearer token for client authentication
 * - X-Archive-Access-Key / X-Archive-Secret-Key headers: per-request IA S3
 *   credentials, overriding WAYBACK_ACCESS_KEY / WAYBACK_SECRET_KEY env vars
 *
 * Environment variables (set via `wrangler secret put`):
 * - WAYBACK_ACCESS_KEY: fallback IA S3 credentials for higher SPN2 rate limits
 * - WAYBACK_SECRET_KEY: fallback IA S3 credentials
 * - MCP_AUTH_TOKEN: optional bearer token for client authentication
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./server.ts";
import { CachingFetcher } from "./utils/cache.ts";
import { CacheApiBackend } from "./utils/cache-cache-api.ts";
import { CacheApiRateLimiter } from "./utils/rate-limit-cache-api.ts";
import { StaticTokenAuthProvider } from "./auth/provider.ts";
import type { AuthProvider } from "./auth/provider.ts";
import type { ToolContext } from "./tools/context.ts";

interface Env {
    WAYBACK_ACCESS_KEY?: string;
    WAYBACK_SECRET_KEY?: string;
    MCP_AUTH_TOKEN?: string;
}

const USER_AGENT = "mcp-wayback-machine-worker";

/**
 * Header names for per-request IA S3 credentials.
 * When present, these override the Worker's environment variables,
 * so each client can use its own credentials for higher SPN2 rate limits.
 */
const HEADER_ACCESS_KEY = "X-Archive-Access-Key";
const HEADER_SECRET_KEY = "X-Archive-Secret-Key";

/**
 * Resolve IA S3 credentials: per-request headers take precedence over
 * Worker environment variables. Returns undefined when neither source
 * provides a complete key pair.
 */
function resolveCredentials(
    request: Request,
    env: Env
): { accessKey: string; secretKey: string } | undefined {
    const headerAccess = request.headers.get(HEADER_ACCESS_KEY);
    const headerSecret = request.headers.get(HEADER_SECRET_KEY);
    if (headerAccess !== null && headerSecret !== null) {
        return { accessKey: headerAccess, secretKey: headerSecret };
    }

    if (
        env.WAYBACK_ACCESS_KEY !== undefined &&
        env.WAYBACK_SECRET_KEY !== undefined
    ) {
        return {
            accessKey: env.WAYBACK_ACCESS_KEY,
            secretKey: env.WAYBACK_SECRET_KEY,
        };
    }

    return undefined;
}

/**
 * Build a ToolContext wired to Cache API–backed caching and rate limiting,
 * with optional credentials resolved from request headers or env vars.
 */
function createContext(
    credentials: { accessKey: string; secretKey: string } | undefined
): ToolContext {
    const cacheBackend = new CacheApiBackend();
    const fetcher = new CachingFetcher({ backend: cacheBackend });
    const limiter = new CacheApiRateLimiter({
        maxRequests: 15,
        windowMs: 60000,
    });

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
            return fetcher.fetch(url, { ...options, headers });
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
    validate() {
        return Promise.resolve(undefined);
    },
};

/**
 * Maximum wall-clock time for a single Worker invocation.
 * Cloudflare Workers on the free tier have a 30-second limit;
 * we abort at 25s to leave time for cleanup and response serialisation.
 */
const WORKER_TIMEOUT_MS = 25_000;

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

        const credentials = resolveCredentials(request, env);
        const ctx = createContext(credentials);
        const server: McpServer = createServer(ctx);

        // Race the MCP handler against a hard timeout so the Worker
        // never hangs indefinitely when upstream APIs are slow or
        // rate-limiting.
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
            setTimeout(
                () => { reject(new Error(`Worker timeout after ${String(WORKER_TIMEOUT_MS)}ms`)); },
                WORKER_TIMEOUT_MS
            );
        });

        try {
            await server.connect(transport);
            return await Promise.race([
                transport.handleRequest(request),
                timeoutPromise,
            ]);
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
