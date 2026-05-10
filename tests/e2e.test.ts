/**
 * E2E (live) tests — call the real Wayback Machine APIs.
 *
 * Gated behind WAYBACK_LIVE_TESTS=1 to avoid hitting rate limits in CI.
 * Run manually: WAYBACK_LIVE_TESTS=1 pnpm test:e2e
 *
 * The Wayback Machine enforces aggressive server-side rate limits
 * (HTTP 498 / 503). Tests that hit rate limits are logged and skipped
 * rather than failed — rate-limiting is expected behaviour, not a bug.
 * A 10-second delay between tests mitigates but cannot eliminate this.
 *
 * Uses well-known URLs that are guaranteed to be archived.
 * Does NOT test save_url (destructive, requires auth).
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../src/server.ts";
import { context } from "../src/contexts.ts";

const skip = process.env.WAYBACK_LIVE_TESTS !== "1";

/** Well-known URLs that are guaranteed to be heavily archived.
 * Using different URLs per test spreads load across different
 * CDX partitions, reducing the chance of hitting rate limits. */
const ARCHIVED_URL = "https://example.com";
const ARCHIVED_URL_ALT = "https://www.w3.org/";

let client: Client;
let close: () => Promise<void>;

async function callTool(
    name: string,
    arguments_: Record<string, unknown>
): Promise<CallToolResult> {
    const result = await client.callTool(
        { name, arguments: arguments_ },
        CallToolResultSchema
    );
    return result as CallToolResult;
}

async function setup(): Promise<void> {
    const server = createServer(context);
    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();

    client = new Client(
        { name: "e2e-test-client", version: "0.0.0" },
        { capabilities: {} }
    );

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    close = async () => {
        await client.close();
        await server.close();
    };
}

/**
 * Assert that the tool result is not a rate-limit error.
 * If it is, log it and skip the test — rate limits are expected
 * behaviour when hitting the live API, not a test failure.
 *
 * The Wayback Machine rate-limits in two ways:
 * 1. Direct: HTTP 498 / 503 / timeout
 * 2. Silent: the availability API returns 200 with empty data,
 *    causing tools to report "not found" for well-known URLs.
 */
function assertNotRateLimited(
    result: CallToolResult,
    wellKnownUrl = false
): void {
    if (result.isError !== true) return;

    const text = textContent(result);
    if (
        text.includes("HTTP 498") ||
        text.includes("HTTP 503") ||
        text.includes("Request timeout")
    ) {
        console.log(`  ⚠ Rate-limited by Wayback Machine — skipping assertion`);
        console.log(`    Error: ${text.slice(0, 200)}`);
        return;
    }

    // The availability API sometimes returns empty data when rate-limited,
    // causing "not found" for URLs that are definitely archived.
    if (wellKnownUrl && text.includes("No archived versions found")) {
        console.log(
            `  ⚠ Likely rate-limited (availability API returned empty) — skipping assertion`
        );
        console.log(`    Error: ${text.slice(0, 200)}`);
        return;
    }

    // Non-rate-limit errors are real failures
    assert.equal(result.isError, undefined, `Unexpected error: ${text}`);
}

describe("E2E — live Wayback Machine API", { skip }, () => {
    before(setup);
    after(async () => {
        await close();
    });

    // The Wayback Machine enforces aggressive server-side rate limits
    // (HTTP 498 / 503). A 10-second delay between tests is the minimum
    // to avoid triggering them when running the full suite.
    beforeEach(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
    });

    describe("tools/list", () => {
        it("returns all seven tools", async () => {
            const { tools } = await client.listTools();
            assert.equal(tools.length, 7);
        });
    });

    describe("search_archives", () => {
        it(
            "returns real archived snapshots for a well-known URL",
            { timeout: 60_000 },
            async () => {
                const result = await callTool("search_archives", {
                    url: ARCHIVED_URL,
                    limit: 5,
                });

                assertNotRateLimited(result);
                if (result.isError) return; // skipped due to rate limit

                const text = textContent(result);
                assert.match(text, /Found \d+ archived versions/);
                assert.match(text, /Date:/);
                assert.match(text, /Status:/);
            }
        );
    });

    describe("get_archived_url", () => {
        it(
            "retrieves a real archived snapshot",
            { timeout: 60_000 },
            async () => {
                const result = await callTool("get_archived_url", {
                    url: ARCHIVED_URL_ALT,
                    timestamp: "latest",
                });

                assertNotRateLimited(result, true);
                if (result.isError) return; // skipped due to rate limit

                const text = textContent(result);
                assert.match(text, /Found archived version/);
                assert.match(text, /Available: Yes/);
            }
        );
    });

    describe("check_archive_status", () => {
        it("returns real capture statistics for a well-known URL", async () => {
            const result = await callTool("check_archive_status", {
                url: ARCHIVED_URL,
            });

            assertNotRateLimited(result);
            if (result.isError) return; // skipped due to rate limit

            const text = textContent(result);
            assert.match(text, /Archive status/);
            assert.match(text, /Total captures/);
        });
    });

    describe("list_screenshots", () => {
        it(
            "returns screenshot results (or empty) for a well-known URL",
            { timeout: 60_000 },
            async () => {
                const result = await callTool("list_screenshots", {
                    url: ARCHIVED_URL_ALT,
                    limit: 5,
                });

                assertNotRateLimited(result);
                if (result.isError) return; // skipped due to rate limit

                const text = textContent(result);
                assert.ok(
                    text.includes("No screenshots found") ||
                        text.includes("Found"),
                    "returns a valid response"
                );
            }
        );
    });

    describe("compare_snapshots", () => {
        it("compares two real archived snapshots", async () => {
            const result = await callTool("compare_snapshots", {
                url: ARCHIVED_URL,
                timestampA: "20230101120000",
                timestampB: "20240601120000",
            });

            assertNotRateLimited(result);
            if (result.isError) return; // skipped due to rate limit

            const text = textContent(result);
            assert.match(text, /Comparing snapshots/);
            assert.match(text, /Snapshot A:/);
            assert.match(text, /Snapshot B:/);
        });
    });

    describe("clear_cache", () => {
        it("clears the cache via the live server", async () => {
            const result = await callTool("clear_cache", {});

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.match(text, /Cache cleared/);
        });
    });

    describe("non-archived URL", () => {
        it("reports that a fictional URL is not archived", async () => {
            const result = await callTool("check_archive_status", {
                url: "https://this-domain-does-not-exist-zzz.example.com",
            });

            assertNotRateLimited(result);
            if (result.isError) return; // skipped due to rate limit

            const text = textContent(result);
            assert.match(text, /not been archived/);
        });
    });
});

function textContent(result: CallToolResult): string {
    assert.ok(result.content, "result has content");
    const textItem = result.content.find((c) => c.type === "text");
    assert.ok(textItem, "result has a text content item");
    assert.equal(textItem.type, "text");
    return textItem.text;
}
