import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clearCache, getCacheStatus } from "../../src/tools/cache.ts";

describe("clearCache", () => {
    it("clears cache successfully", async () => {
        const result = await clearCache();
        assert.equal(result.success, true);
        assert.match(result.message, /cleared/i);
    });
});

describe("getCacheStatus", () => {
    it("returns cache statistics", () => {
        const result = getCacheStatus();
        assert.equal(result.success, true);
        assert.ok(result.memoryEntries >= 0);
    });
});
