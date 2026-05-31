/**
 * Worker transport and health tool tests.
 *
 * Tests the full Worker request/response cycle through the
 * WebStandardStreamableHTTPServerTransport, a health check tool
 * that doesn't hit external APIs, and timeout/error handling.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "../src/server.ts";
import type { ToolContext } from "../src/tools/context.ts";
import type { CachedResponse } from "../src/utils/cache.ts";
import type { CacheBackend } from "../src/utils/cache.ts";

// --- Helpers ---

class MemoryCacheBackend implements CacheBackend {
    private readonly store = new Map<string, CachedResponse>();
    async get(key: string) {
        return this.store.get(key);
    }
    async set(key: string, entry: CachedResponse) {
        this.store.set(key, entry);
    }
    async delete(key: string) {
        this.store.delete(key);
    }
    async clear() {
        this.store.clear();
    }
}

function cannedContext(
    responses: Map<string, { status: number; body: string }>
): ToolContext {
    return {
        async fetch(url) {
            const canned = responses.get(url);
            if (canned !== undefined) {
                return new Response(canned.body, {
                    status: canned.status,
                    headers: { "content-type": "application/json" },
                });
            }
            return fetch(url);
        },
        async fetchJSON(url, schema) {
            const response = await this.fetch(url);
            const text = await response.text();
            const parsed: unknown = JSON.parse(text);
            return schema.parse(parsed);
        },
    };
}

function failingContext(errorMessage: string): ToolContext {
    return {
        async fetch() {
            throw new Error(errorMessage);
        },
        async fetchJSON() {
            throw new Error(errorMessage);
        },
    };
}

async function sendMcpRequest(
    ctx: ToolContext,
    body: Record<string, unknown>
): Promise<Response> {
    const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true,
    });
    const server = createServer(ctx);
    await server.connect(transport);

    const request = new Request("http://localhost:8787/", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
        },
        body: JSON.stringify(body),
    });

    const response = await transport.handleRequest(request);
    await server.close();
    return response;
}

// --- Tests ---

describe("Health tool", () => {
    it("returns server status without hitting external APIs", async () => {
        const ctx = failingContext("should not be called");
        const response = await sendMcpRequest(ctx, {
            jsonrpc: "2.0",
            method: "tools/call",
            params: { name: "health", arguments: {} },
            id: 1,
        });

        assert.equal(response.status, 200);
        const text = await response.text();
        assert.ok(text.length > 0, "Response body should not be empty");

        const json = JSON.parse(text) as {
            result?: { content: Array<{ type: string; text: string }> };
            error?: { message: string };
        };
        assert.ok(
            json.result,
            `Expected result, got error: ${JSON.stringify(json.error)}`
        );
        const content = json.result.content[0];
        assert.equal(content.type, "text");

        const payload = JSON.parse(content.text) as Record<string, unknown>;
        assert.ok(
            payload.status === "ok",
            `Expected status "ok", got "${String(payload.status)}"`
        );
        assert.ok(typeof payload.version === "string", "Should include version");
    });

    it("responds instantly even when upstream is slow", async () => {
        const ctx: ToolContext = {
            async fetch() {
                await new Promise((resolve) => setTimeout(resolve, 30_000));
                return new Response("ok", { status: 200 });
            },
            async fetchJSON() {
                await new Promise((resolve) => setTimeout(resolve, 30_000));
                throw new Error("should not reach here");
            },
        };

        const start = Date.now();
        const response = await sendMcpRequest(ctx, {
            jsonrpc: "2.0",
            method: "tools/call",
            params: { name: "health", arguments: {} },
            id: 2,
        });
        const elapsed = Date.now() - start;

        assert.equal(response.status, 200);
        assert.ok(
            elapsed < 1_000,
            `Took ${String(elapsed)}ms - health should respond in < 1s`
        );
    });
});

describe("Worker error handling", () => {
    it("returns an error response when upstream fetch fails", async () => {
        const ctx = failingContext("Connection refused");
        const response = await sendMcpRequest(ctx, {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "check_archive_status",
                arguments: { url: "https://example.com" },
            },
            id: 3,
        });

        assert.equal(response.status, 200);
        const text = await response.text();
        const json = JSON.parse(text) as {
            result?: {
                content: Array<{ type: string; text: string }>;
                isError?: boolean;
            };
        };
        assert.ok(json.result?.isError, "Should have isError: true");
        assert.ok(
            json.result.content[0].text.includes("Connection refused"),
            `Error message should mention the cause, got: ${json.result.content[0].text}`
        );
    });
});
