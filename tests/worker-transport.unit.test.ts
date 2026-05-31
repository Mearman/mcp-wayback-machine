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

// --- Helpers ---

function failingContext(errorMessage: string): ToolContext {
    return {
        fetch() {
            return Promise.reject(new Error(errorMessage));
        },
        fetchJSON() {
            return Promise.reject(new Error(errorMessage));
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
        const body = await response.text();
        assert.ok(body.length > 0, "Response body should not be empty");

        const json = JSON.parse(body) as {
            result?: { content: { type: string; text: string }[] };
            error?: { message: string };
        };
        assert.ok(
            json.result,
            `Expected result, got error: ${JSON.stringify(json.error)}`
        );
        const content = json.result.content[0]!;
        assert.equal(content.type, "text");

        const payload = JSON.parse(content.text) as Record<string, unknown>;
        assert.ok(
            payload.status === "ok",
            `Expected status "ok", got "${String(payload.status)}"`
        );
        assert.ok(typeof payload.version === "string", "Should include version");
    });

    it("responds instantly even when upstream is slow", async () => {
        const slowPromise = new Promise<Response>(() => {
            // Never resolves - simulates a hung upstream
        });
        const ctx: ToolContext = {
            fetch() {
                return slowPromise;
            },
            fetchJSON() {
                return slowPromise.then(() => {
                    throw new Error("unreachable");
                });
            },
        };

        const start = Date.now();
        const response = await sendMcpRequest(ctx, {
            jsonrpc: "2.0",
            method: "tools/call",
            params: { name: "health", arguments: {} },
            id: 2,
        });
        void response;
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
        const body = await response.text();
        const json = JSON.parse(body) as {
            result?: {
                content: { type: string; text: string }[];
                isError?: boolean;
            };
        };
        assert.ok(json.result, "Should have result");
        assert.ok(json.result.isError === true, "Should have isError: true");
        const entry = json.result.content[0];
        assert.ok(entry, "Should have content");
        const resultText: string = entry.text;
        assert.ok(
            resultText.includes("Connection refused"),
            `Error message should mention the cause, got: ${resultText}`
        );
    });
});
