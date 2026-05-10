#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.ts";
import { context } from "./contexts.ts";

async function main(): Promise<void> {
    const isCliMode = process.stdin.isTTY || process.argv.length > 2;

    if (isCliMode && process.argv.length > 2) {
        const { createCLI } = await import("./cli.js");
        const program = createCLI();
        await program.parseAsync(process.argv);
    } else {
        const server = createServer(context);
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("MCP Wayback Machine server running on stdio");
    }
}

main().catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
