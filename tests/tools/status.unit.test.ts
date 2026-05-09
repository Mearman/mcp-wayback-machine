import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkArchiveStatus } from "../../src/tools/status.ts";
import { fakeFetch, rejectingFetch, testContext } from "../helpers.ts";

describe("checkArchiveStatus", () => {
    it("returns statistics from sparkline API", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/__wb/sparkline",
                    body: JSON.stringify({
                        years: {
                            "2023": { "timeseries-csp": [1, 2, 3] },
                            "2024": { "timeseries-csp": [4, 5, 6] },
                        },
                    }),
                },
                {
                    url: "archive.org/wayback/available",
                    body: JSON.stringify({
                        url: "https://example.com",
                        archived_snapshots: {
                            closest: {
                                status: "200",
                                available: true,
                                url: "https://web.archive.org/web/20240101120000/https://example.com/",
                                timestamp: "20240101120000",
                            },
                        },
                    }),
                },
            ])
        );
        const result = await checkArchiveStatus(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.isArchived, true);
        assert.equal(result.totalCaptures, 21);
        assert.equal(result.firstCapture, "2023-01-01");
        assert.equal(result.lastCapture, "2024-01-01");
    });

    it("omits lastCapture when not provided", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/__wb/sparkline",
                    body: JSON.stringify({
                        years: {
                            "2023": { "timeseries-csp": [1, 2, 3] },
                        },
                    }),
                },
                {
                    url: "archive.org/wayback/available",
                    body: JSON.stringify({
                        url: "https://example.com",
                        archived_snapshots: {},
                    }),
                },
            ])
        );
        const result = await checkArchiveStatus(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.isArchived, true);
        assert.equal(result.lastCapture, undefined);
    });

    it("falls back to availability API", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/__wb/sparkline",
                    body: JSON.stringify({}),
                },
                {
                    url: "archive.org/wayback/available",
                    body: JSON.stringify({
                        url: "https://example.com",
                        archived_snapshots: {
                            closest: {
                                status: "200",
                                available: true,
                                url: "https://web.archive.org/web/20240101120000/https://example.com/",
                                timestamp: "20240101120000",
                            },
                        },
                    }),
                },
            ])
        );
        const result = await checkArchiveStatus(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.isArchived, true);
        assert.equal(result.lastCapture, "2024-01-01");
    });

    it("returns not archived when neither API has data", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/__wb/sparkline",
                    body: JSON.stringify({}),
                },
                {
                    url: "archive.org/wayback/available",
                    body: JSON.stringify({
                        url: "https://example.com",
                        archived_snapshots: {},
                    }),
                },
            ])
        );
        const result = await checkArchiveStatus(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.isArchived, false);
    });

    it("handles 404 as not archived", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/__wb/sparkline",
                    body: JSON.stringify({}),
                },
                {
                    url: "archive.org/wayback/available",
                    status: 404,
                    body: "Not Found",
                },
            ])
        );
        const result = await checkArchiveStatus(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.isArchived, false);
    });

    it("handles HTTP errors", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/__wb/sparkline",
                    status: 500,
                    body: "Internal Server Error",
                },
            ])
        );
        const result = await checkArchiveStatus(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, false);
        assert.match(result.message, /Failed to check/);
    });

    it("handles network errors", async () => {
        const ctx = testContext(rejectingFetch());
        const result = await checkArchiveStatus(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, false);
        assert.match(result.message, /Failed to check/);
    });

    it("rejects invalid URLs", async () => {
        const ctx = testContext(fakeFetch([]));
        const result = await checkArchiveStatus({ url: "not-a-url" }, ctx);

        assert.equal(result.success, false);
    });
});
