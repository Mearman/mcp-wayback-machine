import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareSnapshots } from "../../src/tools/compare.ts";
import { fakeFetch, testContext } from "../helpers.ts";

const HTML_A = "<html><body>Version A</body></html>";
const HTML_B = "<html><body>Version B</body></html>";

describe("compareSnapshots", () => {
    it("compares two explicit timestamps", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/web/20230101120000id_",
                    body: HTML_A,
                },
                {
                    url: "web.archive.org/web/20240101120000id_",
                    body: HTML_B,
                },
            ])
        );
        const result = await compareSnapshots(
            {
                url: "https://example.com",
                timestampA: "20230101120000",
                timestampB: "20240101120000",
            },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.snapshotA?.timestamp, "20230101120000");
        assert.equal(result.snapshotB?.timestamp, "20240101120000");
        assert.equal(result.contentA, HTML_A);
        assert.equal(result.contentB, HTML_B);
        assert.ok(result.changesUrl);
    });

    it("auto-selects oldest and newest when no timestamps given", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([
                        ["timestamp", "statuscode"],
                        ["20220101120000", "200"],
                        ["20230101120000", "200"],
                        ["20240101120000", "200"],
                    ]),
                },
                {
                    url: "web.archive.org/web/20220101120000id_",
                    body: HTML_A,
                },
                {
                    url: "web.archive.org/web/20240101120000id_",
                    body: HTML_B,
                },
            ])
        );
        const result = await compareSnapshots(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, true);
        assert.equal(result.snapshotA?.timestamp, "20220101120000");
        assert.equal(result.snapshotB?.timestamp, "20240101120000");
    });

    it("returns error when not enough snapshots", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([
                        ["timestamp", "statuscode"],
                        ["20240101120000", "200"],
                    ]),
                },
            ])
        );
        const result = await compareSnapshots(
            { url: "https://example.com" },
            ctx
        );

        assert.equal(result.success, false);
        assert.match(result.message, /Not enough archived snapshots/);
    });

    it("handles HTTP errors", async () => {
        const ctx = testContext(
            fakeFetch([
                {
                    url: "web.archive.org/web/20230101120000id_",
                    status: 500,
                    body: "Internal Server Error",
                },
            ])
        );
        const result = await compareSnapshots(
            {
                url: "https://example.com",
                timestampA: "20230101120000",
                timestampB: "20240101120000",
            },
            ctx
        );

        assert.equal(result.success, false);
        assert.match(result.message, /Failed to compare/);
    });

    it("rejects invalid URLs", async () => {
        const ctx = testContext(fakeFetch([]));
        const result = await compareSnapshots({ url: "not-a-url" }, ctx);

        assert.equal(result.success, false);
    });
});
