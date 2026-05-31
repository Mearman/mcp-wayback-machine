/**
 * Cache API–backed rate limiter for Cloudflare Workers.
 *
 * Uses the global `caches` API to store a sliding-window counter.
 * No Durable Object binding required — works within the free tier
 * without the 1M DO requests/month limit.
 *
 * Not atomic across concurrent requests: two simultaneous calls may
 * both read the same count and both proceed. This is acceptable because:
 *   1. MCP clients are typically sequential (one tool call at a time).
 *   2. The upstream Wayback Machine has its own rate limiting.
 *   3. The occasional extra request over the limit is harmless.
 */

import type { RateLimitBackend } from "./rate-limit.ts";

interface WindowState {
    count: number;
    expiresAt: number;
}

const CACHE_NAME = "mcp-wayback-machine-ratelimit";

export class CacheApiRateLimiter implements RateLimitBackend {
    private readonly maxRequests: number;
    private readonly windowMs: number;
    private cache?: Awaited<ReturnType<typeof caches.open>>;

    constructor(options: { maxRequests: number; windowMs: number }) {
        this.maxRequests = options.maxRequests;
        this.windowMs = options.windowMs;
    }

    private async getCache() {
        this.cache ??= await caches.open(CACHE_NAME);
        return this.cache;
    }

    async acquire(): Promise<void> {
        const now = Date.now();
        const windowKey = this.windowKey(now);
        const cache = await this.getCache();

        // Read current window state
        const state = await this.readState(cache, windowKey, now);

        if (state.count < this.maxRequests) {
            // Under limit — record and proceed
            state.count++;
            await this.writeState(cache, windowKey, state);
            return;
        }

        // Over limit — wait until the window expires, then try again
        const waitMs = state.expiresAt - now + 100;
        if (waitMs > 0 && waitMs < 120_000) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        // Re-read after waiting (window may have rotated)
        const nowAfter = Date.now();
        const keyAfter = this.windowKey(nowAfter);
        const stateAfter = await this.readState(cache, keyAfter, nowAfter);
        stateAfter.count++;
        await this.writeState(cache, keyAfter, stateAfter);
    }

    private async readState(
        cache: Cache,
        key: string,
        now: number
    ): Promise<WindowState> {
        try {
            const request = new Request(`https://ratelimit.local/${key}`);
            const response = await cache.match(request);
            if (response !== undefined) {
                const parsed: unknown = await response.json();
                if (
                    typeof parsed === "object" &&
                    parsed !== null &&
                    "count" in parsed &&
                    "expiresAt" in parsed
                ) {
                    const state = parsed as WindowState;
                    // If the window hasn't expired, use it
                    if (state.expiresAt > now) {
                        return state;
                    }
                }
            }
        } catch {
            // Cache miss or parse failure — start fresh
        }

        // New window
        return {
            count: 0,
            expiresAt: now + this.windowMs,
        };
    }

    private async writeState(
        cache: Cache,
        key: string,
        state: WindowState
    ): Promise<void> {
        const ttlMs = state.expiresAt - Date.now();
        if (ttlMs <= 0) {
            return;
        }

        const maxAge = Math.ceil(ttlMs / 1000);
        const request = new Request(`https://ratelimit.local/${key}`);
        const response = new Response(JSON.stringify(state), {
            headers: {
                "content-type": "application/json",
                "cache-control": `public, max-age=${String(maxAge)}`,
            },
        });

        try {
            await cache.put(request, response);
        } catch {
            // Non-fatal
        }
    }

    /**
     * Generate a window key from a timestamp. Rounds down to the
     * window boundary so all requests within the same window share
     * the same key.
     */
    private windowKey(now: number): string {
        const windowIndex = Math.floor(now / this.windowMs);
        return `w-${String(windowIndex)}`;
    }
}
