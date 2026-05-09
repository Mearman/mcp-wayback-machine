import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listScreenshots } from "../../src/tools/screenshots.ts";
import { fakeFetch, testContext } from "../helpers.ts";

describe("listScreenshots", () => {
    it("returns screenshots when found", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([
                        ["timestamp", "original"],
                        [
                            "20240115123456",
                            "web.archive.org/screenshot/https://example.com/",
                        ],
                        [
                            "20231201080000",
                            "web.archive.org/screenshot/https://example.com/",
                        ],
                    ]),
                },
            ])
        );
        const result = await listScreenshots(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.totalScreenshots, 2);
        const first = result.screenshots?.[0];
        assert.ok(first);
        assert.equal(first.timestamp, "20240115123456");
        assert.equal(
            first.screenshotUrl,
            "https://web.archive.org/web/20240115123456im_/https://example.com"
        );
    });

    it("returns empty when no screenshots found", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([["timestamp", "original"]]),
                },
            ])
        );
        const result = await listScreenshots(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.totalScreenshots, 0);
    });

    it("handles 404 as no screenshots", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    status: 404,
                    body: "Not Found",
                },
            ])
        );
        const result = await listScreenshots(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.totalScreenshots, 0);
    });
});
