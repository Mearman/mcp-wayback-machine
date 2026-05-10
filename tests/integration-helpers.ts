/**
 * Integration test helpers — sets up an in-memory MCP client/server pair
 * with a fake ToolContext for the HTTP boundary.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.ts";
import type { ToolContext } from "../src/tools/context.ts";
import { fakeFetch, rejectingFetch } from "./helpers.ts";

/**
 * Create a fake ToolContext wired to canned responses, suitable for
 * integration tests that need the full MCP server but no real HTTP.
 */
export function integrationContext(
    responses: Parameters<typeof fakeFetch>[0]
): ToolContext {
    return {
        fetch: fakeFetch(responses),
        async fetchJSON<T>(
            url: string,
            schema: { parse: (v: unknown) => T }
        ): Promise<T> {
            const response = await fakeFetch(responses)(url);
            const text = await response.text();
            const parsed: unknown = JSON.parse(text);
            return schema.parse(parsed);
        },
    };
}

/**
 * Create a fake ToolContext that rejects all requests.
 */
export function rejectingContext(): ToolContext {
    const fetch = rejectingFetch();
    return {
        fetch,
        fetchJSON<T>(
            url: string,
            schema: { parse: (v: unknown) => T }
        ): Promise<T> {
            return fetch(url).then(
                (response) => {
                    // Parse and validate even though we expect rejection.
                    // This ensures the schema contract is honoured.
                    return response.text().then((text) => {
                        const parsed: unknown = JSON.parse(text);
                        return schema.parse(parsed);
                    });
                },
                (error: unknown) => {
                    throw error;
                }
            );
        },
    };
}

/**
 * Spin up an in-memory MCP client/server pair and return the connected client.
 * The server uses the provided ToolContext for all tool execution.
 */
export async function createMcpClient(
    ctx: ToolContext
): Promise<{ client: Client; close: () => Promise<void> }> {
    const server = createServer(ctx);
    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();

    const client = new Client(
        { name: "test-client", version: "0.0.0" },
        { capabilities: {} }
    );

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    return {
        client,
        close: async () => {
            await client.close();
            await server.close();
        },
    };
}
