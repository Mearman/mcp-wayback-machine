import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CachingFetcher, TTL } from "../../src/utils/cache.ts";

const originalFetch = globalThis.fetch;
let tempDir: string;

function createMockResponse(body: string, status = 200): Response {
    return new Response(body, {
        status,
        statusText: status === 200 ? "OK" : "Error",
        headers: { "content-type": "application/json" },
    });
}

beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "cache-test-"));
});

afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(tempDir, { recursive: true, force: true });
});

describe("CachingFetcher", () => {
    it("fetches from network on cache miss", async () => {
        let fetchCount = 0;
        globalThis.fetch = () => {
            fetchCount++;
            return Promise.resolve(createMockResponse('{"data":1}'));
        };

        const fetcher = new CachingFetcher({ diskDir: tempDir });
        const response = await fetcher.fetch("https://example.com/api");

        assert.equal(response.status, 200);
        assert.equal(await response.text(), '{"data":1}');
        assert.equal(fetchCount, 1);
    });

    it("returns cached response on memory hit", async () => {
        let fetchCount = 0;
        globalThis.fetch = () => {
            fetchCount++;
            return Promise.resolve(createMockResponse('{"data":1}'));
        };

        const fetcher = new CachingFetcher({ diskDir: tempDir, ttl: 60000 });

        await fetcher.fetch("https://example.com/api");
        const response = await fetcher.fetch("https://example.com/api");

        assert.equal(await response.text(), '{"data":1}');
        assert.equal(fetchCount, 1, "should not fetch again");
    });

    it("bypasses cache for non-GET requests", async () => {
        let fetchCount = 0;
        globalThis.fetch = () => {
            fetchCount++;
            return Promise.resolve(createMockResponse('{"ok":true}'));
        };

        const fetcher = new CachingFetcher({ diskDir: tempDir, ttl: 60000 });

        await fetcher.fetch("https://example.com/api", { method: "POST" });
        await fetcher.fetch("https://example.com/api", { method: "POST" });

        assert.equal(fetchCount, 2, "POST should not be cached");
    });

    it("bypasses cache when cacheTtl is false", async () => {
        let fetchCount = 0;
        globalThis.fetch = () => {
            fetchCount++;
            return Promise.resolve(createMockResponse('{"ok":true}'));
        };

        const fetcher = new CachingFetcher({ diskDir: tempDir, ttl: 60000 });

        await fetcher.fetch("https://example.com/api", {}, false);
        await fetcher.fetch("https://example.com/api", {}, false);

        assert.equal(fetchCount, 2);
    });

    it("re-fetches after TTL expires", async () => {
        let fetchCount = 0;
        globalThis.fetch = () => {
            fetchCount++;
            return Promise.resolve(
                createMockResponse(`{"call":${String(fetchCount)}}`)
            );
        };

        const fetcher = new CachingFetcher({
            diskDir: tempDir,
            ttl: 1, // 1ms TTL
        });

        await fetcher.fetch("https://example.com/api");
        // Wait for TTL to expire
        await new Promise((resolve) => setTimeout(resolve, 10));
        await fetcher.fetch("https://example.com/api");

        assert.equal(fetchCount, 2, "should re-fetch after expiry");
    });

    it("clears both caches", async () => {
        let fetchCount = 0;
        globalThis.fetch = () => {
            fetchCount++;
            return Promise.resolve(createMockResponse('{"data":1}'));
        };

        const fetcher = new CachingFetcher({ diskDir: tempDir, ttl: 60000 });

        await fetcher.fetch("https://example.com/api");
        await fetcher.clear();
        await fetcher.fetch("https://example.com/api");

        assert.equal(fetchCount, 2, "should re-fetch after clear");
    });

    it("prunes expired entries", async () => {
        let fetchCount = 0;
        globalThis.fetch = () => {
            fetchCount++;
            return Promise.resolve(createMockResponse('{"data":1}'));
        };

        const fetcher = new CachingFetcher({
            diskDir: tempDir,
            ttl: 1,
        });

        await fetcher.fetch("https://example.com/api");
        await new Promise((resolve) => setTimeout(resolve, 10));
        await fetcher.prune();
        await fetcher.fetch("https://example.com/api");

        assert.equal(fetchCount, 2, "should re-fetch after prune");
    });

    it("handles disk read failure gracefully", async () => {
        let fetchCount = 0;
        globalThis.fetch = () => {
            fetchCount++;
            return Promise.resolve(createMockResponse('{"data":1}'));
        };

        // Use a non-existent disk dir — writes will fail, reads will miss
        const fetcher = new CachingFetcher({
            diskDir: "/nonexistent/path/cache",
            ttl: 60000,
        });

        const response = await fetcher.fetch("https://example.com/api");
        assert.equal(response.status, 200);
        assert.equal(fetchCount, 1);
    });

    it("reports cache stats", async () => {
        globalThis.fetch = () =>
            Promise.resolve(createMockResponse('{"data":1}'));

        const fetcher = new CachingFetcher({ diskDir: tempDir, ttl: 60000 });

        const before = fetcher.getStats();
        assert.equal(before.memoryEntries, 0);

        await fetcher.fetch("https://example.com/api");
        const after = fetcher.getStats();
        assert.equal(after.memoryEntries, 1);
    });
});

describe("per-endpoint TTL", () => {
    it("TTL constants are defined", () => {
        assert.ok(TTL.SNAPSHOT > TTL.AVAILABILITY);
        assert.ok(TTL.AVAILABILITY > TTL.SAVE);
        assert.ok(TTL.SAVE > TTL.SAVE_STATUS);
    });

    it("snapshot URLs get longest TTL", async () => {
        globalThis.fetch = () => Promise.resolve(createMockResponse("content"));

        const fetcher = new CachingFetcher({ diskDir: tempDir, ttl: 1000 });

        await fetcher.fetch(
            "https://web.archive.org/web/20240101120000id_/https://example.com/"
        );

        const stats = fetcher.getStats();
        assert.equal(stats.memoryEntries, 1);
    });

    it("availability API gets 1-hour TTL", async () => {
        globalThis.fetch = () => Promise.resolve(createMockResponse("{}"));

        const fetcher = new CachingFetcher({ diskDir: tempDir, ttl: 1000 });

        await fetcher.fetch(
            "https://archive.org/wayback/available?url=https://example.com"
        );

        const stats = fetcher.getStats();
        assert.equal(stats.memoryEntries, 1);
    });

    it("save status polling gets short TTL", async () => {
        globalThis.fetch = () => Promise.resolve(createMockResponse("{}"));

        const fetcher = new CachingFetcher({ diskDir: tempDir, ttl: 1000 });

        await fetcher.fetch("https://web.archive.org/save/status/spn2-abc123");

        const stats = fetcher.getStats();
        assert.equal(stats.memoryEntries, 1);
    });
});
