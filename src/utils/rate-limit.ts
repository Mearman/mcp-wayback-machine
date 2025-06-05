/**
 * Rate limiting utilities for Wayback Machine API
 */

interface RateLimitOptions {
	maxRequests: number;
	windowMs: number;
}

export class RateLimiter {
	private requests: number[] = [];
	private readonly maxRequests: number;
	private readonly windowMs: number;

	constructor(options: RateLimitOptions) {
		this.maxRequests = options.maxRequests;
		this.windowMs = options.windowMs;
	}

	/**
	 * Check if a request can be made without violating rate limits
	 */
	canMakeRequest(): boolean {
		this.cleanup();
		return this.requests.length < this.maxRequests;
	}

	/**
	 * Wait until a request can be made
	 */
	async waitForSlot(): Promise<void> {
		while (!this.canMakeRequest()) {
			const oldestRequest = this.requests[0];
			const waitTime = oldestRequest + this.windowMs - Date.now();
			if (waitTime > 0) {
				await new Promise((resolve) => setTimeout(resolve, waitTime + 100));
			}
			this.cleanup();
		}
	}

	/**
	 * Record a request
	 */
	recordRequest(): void {
		this.requests.push(Date.now());
	}

	/**
	 * Remove expired requests from the tracking array
	 */
	private cleanup(): void {
		const cutoff = Date.now() - this.windowMs;
		this.requests = this.requests.filter((time) => time > cutoff);
	}
}

// Default rate limiter for Wayback Machine
// Conservative limits to be respectful of the service
export const waybackRateLimiter = new RateLimiter({
	maxRequests: 15, // 15 requests
	windowMs: 60000, // per minute
});
