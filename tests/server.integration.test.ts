/**
 * Integration tests — full MCP server round-trip over in-memory transport.
 * Tests tool registration, routing, execution, and response serialisation
 * with the HTTP boundary faked via DI.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
    createMcpClient,
    integrationContext,
    rejectingContext,
} from "./integration-helpers.ts";

/** CDX response data reused across tests */
const cdxHeaders = [
    "urlkey",
    "timestamp",
    "original",
    "mimetype",
    "statuscode",
    "digest",
    "length",
];
const cdxRow = [
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
    "20240601120000",
    "https://example.com",
    "text/html",
    "200",
    "DEF456",
    "5678",
];

const availabilityResponse = JSON.stringify({
    url: "https://example.com",
    archived_snapshots: {
        closest: {
            status: "200",
            available: true,
            url: "https://web.archive.org/web/20240101120000/https://example.com",
            timestamp: "20240101120000",
        },
    },
});

const sparklineResponse = JSON.stringify({
    years: {
        "2024": { "timeseries-csp": [5, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0] },
    },
});

const snapshotHtml =
    "<html><head><title>Example</title></head><body>Example content</body></html>";

let client: Client;
let close: () => Promise<void>;

/**
 * Call a tool via the MCP client, returning a strictly-typed CallToolResult.
 */
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

describe("MCP server integration", () => {
    beforeEach(async () => {
        const result = await createMcpClient(
            integrationContext([
                {
                    url: "web.archive.org/cdx/search/cdx",
                    body: JSON.stringify([cdxHeaders, cdxRow, cdxRow2]),
                },
                {
                    url: "archive.org/wayback/available",
                    body: availabilityResponse,
                },
                {
                    url: "web.archive.org/__wb/sparkline",
                    body: sparklineResponse,
                },
                {
                    url: "web.archive.org/web/20240101120000id_/https://example.com",
                    body: snapshotHtml,
                },
                {
                    url: "web.archive.org/web/20240601120000id_/https://example.com",
                    body: snapshotHtml,
                },
            ])
        );
        client = result.client;
        close = result.close;
    });

    afterEach(async () => {
        await close();
    });

    describe("tools/list", () => {
        it("returns all seven tools", async () => {
            const { tools } = await client.listTools();

            assert.equal(tools.length, 7);

            const names = tools.map((t) => t.name).sort();
            assert.deepStrictEqual(names, [
                "check_archive_status",
                "clear_cache",
                "compare_snapshots",
                "get_archived_url",
                "list_screenshots",
                "save_url",
                "search_archives",
            ]);
        });

        it("each tool has a name, description, and input schema", async () => {
            const { tools } = await client.listTools();

            for (const tool of tools) {
                assert.ok(tool.name, "tool has a name");
                assert.ok(
                    typeof tool.description === "string" &&
                        tool.description.length > 0,
                    `tool ${tool.name} has a description`
                );
                assert.ok(
                    tool.inputSchema,
                    `tool ${tool.name} has an input schema`
                );
                assert.equal(
                    tool.inputSchema.type,
                    "object",
                    `tool ${tool.name} input schema is an object`
                );
            }
        });
    });

    describe("search_archives", () => {
        it("returns search results through MCP round-trip", async () => {
            const result = await callTool("search_archives", {
                url: "https://example.com",
            });

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.match(text, /Found 2 archived versions/);
            assert.match(text, /Date: 2024-01-01/);
            assert.match(text, /Status: 200/);
        });
    });

    describe("get_archived_url", () => {
        it("retrieves an archived URL through MCP round-trip", async () => {
            const result = await callTool("get_archived_url", {
                url: "https://example.com",
            });

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.match(text, /Found archived version/);
            assert.match(text, /Available: Yes/);
            assert.match(text, /Example content/);
        });
    });

    describe("check_archive_status", () => {
        it("returns archive statistics through MCP round-trip", async () => {
            const result = await callTool("check_archive_status", {
                url: "https://example.com",
            });

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.match(text, /Archive status/);
            assert.match(text, /Total captures/);
            assert.match(text, /Captures by year/);
        });
    });

    describe("compare_snapshots", () => {
        it("compares two explicit timestamps through MCP round-trip", async () => {
            const result = await callTool("compare_snapshots", {
                url: "https://example.com",
                timestampA: "20240101120000",
                timestampB: "20240601120000",
            });

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.match(text, /Comparing snapshots/);
            assert.match(text, /Snapshot A: 2024-01-01/);
            assert.match(text, /Snapshot B: 2024-06-01/);
            assert.match(text, /Visual diff/);
        });
    });

    describe("clear_cache", () => {
        it("clears cache through MCP round-trip", async () => {
            const result = await callTool("clear_cache", {});

            assert.equal(result.isError, undefined);
            const text = textContent(result);
            assert.match(text, /Cache cleared/);
        });
    });

    describe("invalid tool name", () => {
        it("returns an error result for an unknown tool", async () => {
            const result = await callTool("nonexistent_tool", {});

            assert.equal(result.isError, true);
            const text = textContent(result);
            assert.match(text, /not found/);
        });
    });

    describe("invalid tool arguments", () => {
        it("returns an error result when required arguments are missing", async () => {
            const result = await callTool("search_archives", {});

            assert.equal(result.isError, true);
            const text = textContent(result);
            assert.match(text, /validation error/i);
        });
    });
});

describe("MCP server — network errors", () => {
    beforeEach(async () => {
        const result = await createMcpClient(rejectingContext());
        client = result.client;
        close = result.close;
    });

    afterEach(async () => {
        await close();
    });

    it("returns an error result when the network is unreachable", async () => {
        const result = await callTool("search_archives", {
            url: "https://example.com",
        });

        assert.equal(result.isError, true);
        const text = textContent(result);
        assert.match(text, /Failed to search/);
    });
});

/**
 * Extract the text content from a CallToolResult.
 */
function textContent(result: CallToolResult): string {
    assert.ok(result.content, "result has content");
    const textItem = result.content.find((c) => c.type === "text");
    assert.ok(textItem, "result has a text content item");
    assert.equal(textItem.type, "text");
    return textItem.text;
}
