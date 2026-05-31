/**
 * Rate limiting for Wayback Machine API requests.
 *
 * RateLimitBackend defines the consumer interface (just acquire()).
 * InMemoryRateLimiter implements it for single-process use (stdio mode).
 * Worker deployments use a Durable Object backend (see rate-limit-do.ts).
 */

/**
 * Consumer interface for rate limiting. Consumers call acquire() before
 * making a request; it resolves when a slot is available.
 */
export interface RateLimitBackend {
    acquire(): Promise<void>;
}

interface RateLimitOptions {
    maxRequests: number;
    windowMs: number;
}

/**
 * In-memory rate limiter using a sliding window of request timestamps.
 * Suitable for single-process use (stdio mode) where all requests share
 * the same heap.
 */
export class InMemoryRateLimiter implements RateLimitBackend {
    private requests: number[] = [];
    private readonly maxRequests: number;
    private readonly windowMs: number;

    constructor(options: RateLimitOptions) {
        this.maxRequests = options.maxRequests;
        this.windowMs = options.windowMs;
    }

    canMakeRequest(): boolean {
        this.cleanup();
        return this.requests.length < this.maxRequests;
    }

    async waitForSlot(): Promise<void> {
        while (!this.canMakeRequest()) {
            const oldestRequest = this.requests[0];
            if (oldestRequest === undefined) break;
            const waitTime = oldestRequest + this.windowMs - Date.now();
            if (waitTime > 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, waitTime + 100)
                );
            }
            this.cleanup();
        }
    }

    recordRequest(): void {
        this.requests.push(Date.now());
    }

    /**
     * Wait for a slot, then reserve it. waitForSlot() guarantees that
     * canMakeRequest() returned true immediately before it resolved,
     * so we can record immediately.
     */
    async acquire(): Promise<void> {
        await this.waitForSlot();
        this.recordRequest();
    }

    private cleanup(): void {
        const cutoff = Date.now() - this.windowMs;
        this.requests = this.requests.filter((time) => time > cutoff);
    }
}

/**
 * Default rate limiter for stdio mode — conservative limits to be
 * respectful of the Internet Archive service.
 */
export const waybackRateLimiter: RateLimitBackend = new InMemoryRateLimiter({
    maxRequests: 15,
    windowMs: 60000,
});
