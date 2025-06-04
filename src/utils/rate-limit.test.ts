import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from './rate-limit.js';

describe('RateLimiter', () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		rateLimiter = new RateLimiter({
			maxRequests: 3,
			windowMs: 1000, // 1 second
		});
		vi.useFakeTimers();
	});

	it('should allow requests within limit', () => {
		expect(rateLimiter.canMakeRequest()).toBe(true);
		rateLimiter.recordRequest();
		expect(rateLimiter.canMakeRequest()).toBe(true);
		rateLimiter.recordRequest();
		expect(rateLimiter.canMakeRequest()).toBe(true);
		rateLimiter.recordRequest();
		expect(rateLimiter.canMakeRequest()).toBe(false);
	});

	it('should reset after window expires', () => {
		rateLimiter.recordRequest();
		rateLimiter.recordRequest();
		rateLimiter.recordRequest();
		expect(rateLimiter.canMakeRequest()).toBe(false);

		vi.advanceTimersByTime(1100);
		expect(rateLimiter.canMakeRequest()).toBe(true);
	});

	it('should wait for slot when rate limited', async () => {
		rateLimiter.recordRequest();
		rateLimiter.recordRequest();
		rateLimiter.recordRequest();

		const waitPromise = rateLimiter.waitForSlot();
		vi.advanceTimersByTime(1100);
		await vi.runAllTimersAsync();
		await expect(waitPromise).resolves.toBeUndefined();
	});
});