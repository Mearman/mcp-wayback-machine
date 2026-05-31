/**
 * Durable Object–backed rate limiter for Cloudflare Workers.
 *
 * The DO is a singleton (unique ID), so all Worker invocations share
 * the same in-memory window. acquire() is an RPC via fetch to the DO
 * stub — the DO handles the wait/sleep so the Worker doesn't burn CPU
 * time while queued.
 *
 * Two exports:
 * - RateLimitDurableObject — the DO class (imported by wrangler config)
 * - DurableObjectRateLimiter — the RateLimitBackend adapter (imported by worker.ts)
 */

import type { RateLimitBackend } from "./rate-limit.ts";

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

/**
 * Adapter that satisfies RateLimitBackend by delegating to the DO via fetch.
 * `env.RATE_LIMIT_DO` is the Durable Object binding injected by the Worker runtime.
 */
export class DurableObjectRateLimiter implements RateLimitBackend {
    private readonly stub: DurableObjectStub;

    constructor(stub: DurableObjectStub) {
        this.stub = stub;
    }

    async acquire(): Promise<void> {
        const response = await this.stub.fetch("https://do/acquire");
        if (!response.ok) {
            // DO returned an error — fall through without blocking.
            // Rate limiting is a courtesy, not a hard gate.
            const text = await response.text().catch(() => "unknown");
            console.error(`Rate limit DO error: ${text}`);
        }
    }
}

/**
 * Durable Object class. Registered in wrangler.toml as a DO binding.
 * Uses the alarm API to sleep until the next slot opens rather than
 * busy-waiting, which keeps Wall Clock Duration (and billing) low.
 *
 * State is held in-memory and reconstructed on evictions from the
 * DO's in-memory cache. Since we only store recent timestamps, a
 * fresh start after eviction is conservative (allows requests immediately)
 * rather than dangerous.
 */
export class RateLimitDurableObject implements DurableObject {
    private readonly config: RateLimitConfig = {
        maxRequests: 15,
        windowMs: 60000,
    };

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const now = Date.now();

        if (url.pathname === "/acquire") {
            return this.handleAcquire(now);
        }

        return new Response("not found", { status: 404 });
    }

    private async handleAcquire(now: number): Promise<Response> {
        const state = await this.loadState();
        this.cleanup(state, now);

        if (state.timestamps.length < this.config.maxRequests) {
            state.timestamps.push(now);
            await this.persistState(state);
            return new Response("ok", { status: 200 });
        }

        // Over limit — calculate how long until the oldest entry expires.
        const oldest = state.timestamps[0];
        if (oldest === undefined) {
            // Shouldn't happen (we just checked length), but handle defensively.
            state.timestamps.push(now);
            await this.persistState(state);
            return new Response("ok", { status: 200 });
        }

        const waitMs = oldest + this.config.windowMs - now + 100;

        // Only wait if it's a reasonable duration (< 2 minutes).
        // Beyond that, let the request through — the upstream Wayback Machine
        // has its own rate limiting and we don't want to block indefinitely.
        if (waitMs > 0 && waitMs < 120_000) {
            // Sleep in the DO so the Worker invocation doesn't burn CPU time.
            // DOs are billed on wall-clock duration but sleeping is much cheaper
            // than active processing.
            await new Promise((resolve) => setTimeout(resolve, waitMs));

            // Re-check after waking — another request may have landed.
            const stateAfter = await this.loadState();
            const after = Date.now();
            this.cleanup(stateAfter, after);

            if (stateAfter.timestamps.length < this.config.maxRequests) {
                stateAfter.timestamps.push(after);
                await this.persistState(stateAfter);
                return new Response("ok", { status: 200 });
            }

            // Still over limit after waiting — let it through.
            // Upstream will 429 if needed.
            stateAfter.timestamps.push(after);
            await this.persistState(stateAfter);
        }

        return new Response("ok", { status: 200 });
    }

    /**
     * Load timestamps from storage. On first access or after eviction,
     * returns an empty array (conservative — allows requests immediately).
     */
    private async loadState(): Promise<{ timestamps: number[] }> {
        const stored = await this.ctx.storage.get<number[]>("timestamps");
        return { timestamps: stored ?? [] };
    }

    private async persistState(state: { timestamps: number[] }): Promise<void> {
        await this.ctx.storage.put("timestamps", state.timestamps);
    }

    private cleanup(
        state: { timestamps: number[] },
        now: number
    ): void {
        const cutoff = now - this.config.windowMs;
        state.timestamps = state.timestamps.filter((t) => t > cutoff);
    }

    private readonly ctx: DurableObjectState;

    constructor(ctx: DurableObjectState) {
        this.ctx = ctx;
    }
}
