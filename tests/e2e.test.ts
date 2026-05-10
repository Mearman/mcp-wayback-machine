/**
 * E2E (live) tests — call the real Wayback Machine APIs.
 *
 * Gated behind WAYBACK_LIVE_TESTS=1 to avoid hitting rate limits in CI.
 * Run manually: WAYBACK_LIVE_TESTS=1 pnpm test:e2e
 *
 * Uses well-known URLs that are guaranteed to be archived (e.g. example.com).
 * Does NOT test save_url (destructive, requires auth).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../src/server.ts";
import { context } from "../src/contexts.ts";

const skip = process.env.WAYBACK_LIVE_TESTS !== "1";

/** Well-known URL that is guaranteed to be heavily archived */
const ARCHIVED_URL = "https://example.com";

let client: Client;
let close: () => Promise<void>;

async function callTool(
    name: string,
    arguments_: Record<string, unknown>
): Promise<CallToolResult> {
    // CallToolResultSchema validates at runtime that the result matches the
    // strict CallToolResult shape (has .content, .isError, etc.).
    // The SDK's return type is a union including the compatibility shape,
    // so we narrow with a type assertion backed by the schema validation.
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

describe("E2E — live Wayback Machine API", { skip }, () => {
    before(setup);
    after(async () => {
        await close();
    });

    describe("tools/list", () => {
        it("returns all seven tools", async () => {
            const { tools } = await client.listTools();
            assert.equal(tools.length, 7);
        });
    });

    describe("search_archives", () => {
        it("returns real archived snapshots for a well-known URL", async () => {
            const result = await callTool("search_archives", {
                url: ARCHIVED_URL,
                limit: 5,
            });

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.match(text, /Found \d+ archived versions/);
            assert.match(text, /Date:/);
            assert.match(text, /Status:/);
        });
    });

    describe("get_archived_url", () => {
        it("retrieves a real archived snapshot", async () => {
            const result = await callTool("get_archived_url", {
                url: ARCHIVED_URL,
                timestamp: "latest",
            });

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.match(text, /Found archived version/);
            assert.match(text, /Available: Yes/);
        });
    });

    describe("check_archive_status", () => {
        it("returns real capture statistics for a well-known URL", async () => {
            const result = await callTool("check_archive_status", {
                url: ARCHIVED_URL,
            });

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.match(text, /Archive status/);
            assert.match(text, /Total captures/);
        });
    });

    describe("list_screenshots", () => {
        it("returns screenshot results (or empty) for a well-known URL", async () => {
            const result = await callTool("list_screenshots", {
                url: ARCHIVED_URL,
                limit: 5,
            });

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.ok(
                text.includes("No screenshots found") || text.includes("Found"),
                "returns a valid response"
            );
        });
    });

    describe("compare_snapshots", () => {
        it("compares two real archived snapshots", async () => {
            const result = await callTool("compare_snapshots", {
                url: ARCHIVED_URL,
                timestampA: "20230101120000",
                timestampB: "20240601120000",
            });

            assert.equal(result.isError, undefined);
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

            assert.equal(result.isError, undefined);
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
