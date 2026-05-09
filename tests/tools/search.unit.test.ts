import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchArchives } from "../../src/tools/search.ts";
import { fakeFetch, rejectingFetch, testContext } from "../helpers.ts";

const cdxHeaders = [
    "urlkey",
    "timestamp",
    "original",
    "mimetype",
    "statuscode",
    "digest",
    "length",
];
const cdxRow1 = [
    "com,example)/",
    "20240101120000",
    "https://example.com",
    "text/html",
    "200",
    "ABC123",
    "1234",
];
const cdxRow2 = [
    "com,example)/",
    "20240102120000",
    "https://example.com",
    "text/html",
    "301",
    "DEF456",
    "5678",
];

describe("searchArchives", () => {
    it("returns mapped results from CDX API", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([cdxHeaders, cdxRow1, cdxRow2]),
                },
            ])
        );
        const result = await searchArchives(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.totalResults, 2);
        const results = result.results;
        assert.ok(results);
        const first = results[0];
        const second = results[1];
        assert.ok(first);
        assert.ok(second);
        assert.equal(first.date, "2024-01-01 12:00:00");
        assert.equal(first.statusCode, "200");
        assert.equal(second.statusCode, "301");
    });

    it("returns empty results when only headers present", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([cdxHeaders]),
                },
            ])
        );
        const result = await searchArchives(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.totalResults, 0);
    });

    it("handles 404 as no results", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    status: 404,
                    body: "Not Found",
                },
            ])
        );
        const result = await searchArchives(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.totalResults, 0);
    });

    it("rejects invalid from date", async () => {
        const ctx = testContext(fakeFetch([]));
        const result = await searchArchives(
            { url: "https://example.com", from: "not-a-date" },
            ctx
        );

        assert.equal(result.success, false);
    });

    it("rejects invalid to date", async () => {
        const ctx = testContext(fakeFetch([]));
        const result = await searchArchives(
            { url: "https://example.com", to: "not-a-date" },
            ctx
        );

        assert.equal(result.success, false);
    });

    it("handles HTTP errors", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    status: 500,
                    body: "Internal Server Error",
                },
            ])
        );
        const result = await searchArchives(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, false);
        assert.match(result.message, /Failed to search/);
    });

    it("handles network errors", async () => {
        const ctx = testContext(rejectingFetch());
        const result = await searchArchives(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, false);
        assert.match(result.message, /Failed to search/);
    });

    it("rejects invalid URLs", async () => {
        const ctx = testContext(fakeFetch([]));
        const result = await searchArchives({ url: "not-a-url" }, ctx);

        assert.equal(result.success, false);
    });

    it("passes date range to API", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([cdxHeaders]),
                },
            ])
        );
        const result = await searchArchives(
            {
                url: "https://example.com",
                from: "2023-01-01",
                to: "2023-12-31",
            },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.totalResults, 0);
    });

    it("passes CDX advanced options", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([cdxHeaders, cdxRow1]),
                },
            ])
        );
        const result = await searchArchives(
            {
                url: "https://example.com",
                matchType: "exact",
                offset: 5,
                collapse: "timestamp:8",
                resolveRevisits: true,
                showDupeCount: true,
                page: 2,
                pageSize: 50,
            },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.totalResults, 1);
        const first = result.results?.[0];
        assert.ok(first);
        assert.equal(first.duplicateCount, undefined);
    });

    it("passes filter parameter", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([cdxHeaders, cdxRow1]),
                },
            ])
        );
        const result = await searchArchives(
            {
                url: "https://example.com",
                filter: ["statuscode:200", "!mimetype:image.*"],
            },
            ctx
        );

        assert.equal(result.success, true);
    });
});
