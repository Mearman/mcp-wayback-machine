import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "../../src/utils/rate-limit.ts";

describe("RateLimiter", () => {
    it("allows requests under the limit", () => {
        const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 });
        assert.equal(limiter.canMakeRequest(), true);
    });

    it("blocks requests at the limit", () => {
        const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
        limiter.recordRequest();
        limiter.recordRequest();
        assert.equal(limiter.canMakeRequest(), false);
    });

    it("allows requests after window expires", () => {
        const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1 });
        limiter.recordRequest();
        assert.equal(limiter.canMakeRequest(), false);
        // Wait for window to expire
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                assert.equal(limiter.canMakeRequest(), true);
                resolve();
            }, 10);
        });
    });

    it("waitForSlot resolves immediately when under limit", async () => {
        const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
        const start = Date.now();
        await limiter.waitForSlot();
        const elapsed = Date.now() - start;
        assert.ok(
            elapsed < 100,
            `Expected fast resolution, took ${String(elapsed)}ms`
        );
    });

    it("waitForSlot waits until a slot opens", async () => {
        const limiter = new RateLimiter({ maxRequests: 1, windowMs: 50 });
        limiter.recordRequest();
        const start = Date.now();
        await limiter.waitForSlot();
        const elapsed = Date.now() - start;
        assert.ok(elapsed >= 40, `Expected to wait, took ${String(elapsed)}ms`);
    });

    it("recordRequest tracks timestamps", () => {
        const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
        limiter.recordRequest();
        limiter.recordRequest();
        limiter.recordRequest();
        assert.equal(limiter.canMakeRequest(), true);
    });
});
