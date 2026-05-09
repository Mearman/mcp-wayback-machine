import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { saveUrl } from "../../src/tools/save.ts";
import { fakeFetch, rejectingFetch, testContext } from "../helpers.ts";

describe("saveUrl", () => {
    it("saves via Location header", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/save",
                    status: 200,
                    headers: {
                        Location: "/web/20240101120000/https://example.com/",
                    },
                },
            ])
        );
        const result = await saveUrl({ url: "https://example.com" }, ctx);

        assert.equal(result.success, true);
        assert.equal(
            result.archivedUrl,
            "https://web.archive.org/web/20240101120000/https://example.com/"
        );
    });

    it("saves via Content-Location header", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/save",
                    status: 200,
                    headers: {
                        "Content-Location":
                            "/web/20240101120000/https://example.com/",
                    },
                },
            ])
        );
        const result = await saveUrl({ url: "https://example.com" }, ctx);

        assert.equal(result.success, true);
        assert.equal(
            result.archivedUrl,
            "https://web.archive.org/web/20240101120000/https://example.com/"
        );
    });

    it("falls back to POST API when no Location header", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/save/https",
                    status: 200,
                },
                {
                    url: "web.archive.org/save",
                    status: 200,
                    body: JSON.stringify({
                        url: "https://web.archive.org/web/20240101120000/https://example.com/",
                        job_id: "abc123",
                        timestamp: "20240101120000",
                    }),
                },
            ])
        );
        const result = await saveUrl({ url: "https://example.com" }, ctx);

        assert.equal(result.success, true);
        assert.equal(result.jobId, "abc123");
    });

    it("handles POST API returning non-JSON", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/save/https",
                    status: 200,
                },
                {
                    url: "web.archive.org/save",
                    status: 200,
                    body: "OK",
                },
            ])
        );
        const result = await saveUrl({ url: "https://example.com" }, ctx);

        assert.equal(result.success, true);
        assert.match(result.message, /Successfully submitted/);
    });

    it("handles rate limit (429)", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/save",
                    status: 429,
                    body: "Rate limit exceeded",
                },
            ])
        );
        const result = await saveUrl({ url: "https://example.com" }, ctx);

        assert.equal(result.success, false);
        assert.match(result.message, /Rate limit/);
    });

    it("handles HTTP errors", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/save",
                    status: 503,
                    body: "Service Unavailable",
                },
            ])
        );
        const result = await saveUrl({ url: "https://example.com" }, ctx);

        assert.equal(result.success, false);
        assert.match(result.message, /Failed to save/);
    });

    it("handles network errors", async () => {
        const ctx = testContext(rejectingFetch());
        const result = await saveUrl({ url: "https://example.com" }, ctx);

        assert.equal(result.success, false);
        assert.match(result.message, /Failed to save/);
    });

    it("rejects invalid URLs", async () => {
        const ctx = testContext(fakeFetch([]));
        const result = await saveUrl({ url: "not-a-url" }, ctx);

        assert.equal(result.success, false);
    });
});
