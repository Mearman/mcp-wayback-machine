import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getArchivedUrl } from "../../src/tools/retrieve.ts";
import { fakeFetch, rejectingFetch, testContext } from "../helpers.ts";

const ARCHIVED_HTML = "<html><body>Archived Content</body></html>";

function retrieveContext(responses: Parameters<typeof fakeFetch>[0]) {
    return testContext(fakeFetch(responses));
}

describe("getArchivedUrl", () => {
    it("returns archived URL and content when available", async () => {
        const ctx = retrieveContext([
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
            {
                url: "web.archive.org/web/20240101120000id_",
                body: ARCHIVED_HTML,
            },
        ]);
        const result = await getArchivedUrl(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(
            result.archivedUrl,
            "https://web.archive.org/web/20240101120000id_/https://example.com"
        );
        assert.equal(result.timestamp, "20240101120000");
        assert.equal(result.content, ARCHIVED_HTML);
    });

    it("returns not found when no snapshots", async () => {
        const ctx = retrieveContext([
            {
                url: "archive.org/wayback/available",
                body: JSON.stringify({
                    url: "https://example.com",
                    archived_snapshots: {
                        closest: {
                            status: "404",
                            available: false,
                            url: "",
                            timestamp: "",
                        },
                    },
                }),
            },
        ]);
        const result = await getArchivedUrl(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, false);
        assert.match(result.message, /No archived versions found/);
    });

    it("constructs direct URL for specific timestamp and fetches content", async () => {
        const ctx = retrieveContext([
            {
                url: "archive.org/wayback/available",
                body: JSON.stringify({
                    url: "https://example.com",
                    archived_snapshots: {},
                }),
            },
            {
                url: "web.archive.org/web/20240101120000id_",
                body: ARCHIVED_HTML,
            },
        ]);
        const result = await getArchivedUrl(
            { url: "https://example.com", timestamp: "20240101120000" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.content, ARCHIVED_HTML);
        assert.equal(result.timestamp, "20240101120000");
    });

    it("handles 'latest' timestamp without direct construction", async () => {
        const ctx = retrieveContext([
            {
                url: "archive.org/wayback/available",
                body: JSON.stringify({
                    url: "https://example.com",
                    archived_snapshots: {},
                }),
            },
        ]);
        const result = await getArchivedUrl(
            { url: "https://example.com", timestamp: "latest" },
            ctx
        );

        assert.equal(result.success, false);
    });

    it("handles HTTP errors", async () => {
        const ctx = retrieveContext([
            {
                url: "archive.org/wayback/available",
                status: 500,
                body: "Internal Server Error",
            },
        ]);
        const result = await getArchivedUrl(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, false);
        assert.match(result.message, /Failed to retrieve/);
    });

    it("handles network errors", async () => {
        const ctx = testContext(rejectingFetch("connection refused"));
        const result = await getArchivedUrl(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, false);
        assert.match(result.message, /connection refused/);
    });

    it("rejects invalid URLs", async () => {
        const ctx = retrieveContext([]);
        const result = await getArchivedUrl({ url: "not-a-url" }, ctx);

        assert.equal(result.success, false);
    });
});
