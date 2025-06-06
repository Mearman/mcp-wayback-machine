#!/usr/bin/env node
/**
 * @fileoverview Entry point that supports both MCP server and CLI modes
 * @module index
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createCLI } from './cli.js';
import { ExampleToolSchema, exampleTool } from './tools/example.js';
import {
	ConfigureFetchSchema,
	FetchExampleSchema,
	configureFetchTool,
	fetchExampleTool,
} from './tools/fetch-example.js';

/**
 * Determine if we're running in CLI mode
 * CLI mode is detected when command line arguments are provided beyond node and script name
 */
export function isCliMode() {
	return process.argv.length > 2;
}

/**
 * Main entry point that handles both MCP and CLI modes
 */
export async function main() {
	if (isCliMode()) {
		// CLI Mode: Run as command-line tool
		const program = createCLI();
		await program.parseAsync(process.argv);
	} else {
		// MCP Mode: Run as MCP server
		await startMcpServer();
	}
}

/**
 * Start the MCP server with all configured tools and handlers
 */
export async function startMcpServer() {
	/**
	 * Create the MCP server instance with configured capabilities
	 */
	const server = new Server(
		{
			name: 'mcp-template',
			version: '0.1.0',
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	/**
	 * Register handler for listing available tools
	 * @returns List of available tools with their schemas
	 */
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [
				{
					name: 'example_tool',
					description: 'An example tool that echoes back the input',
					inputSchema: zodToJsonSchema(ExampleToolSchema),
				},
				{
					name: 'fetch_example',
					description:
						'Demonstrate configurable fetch patterns with different backends and caching',
					inputSchema: zodToJsonSchema(FetchExampleSchema),
				},
				{
					name: 'configure_fetch',
					description:
						'Configure the global fetch instance settings and caching behavior',
					inputSchema: zodToJsonSchema(ConfigureFetchSchema),
				},
			],
		};
	});

	/**
	 * Register handler for executing tool calls
	 * @param request - The tool call request containing tool name and arguments
	 * @returns Tool execution result
	 */
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		switch (name) {
			case 'example_tool':
				return await exampleTool(args);
			case 'fetch_example':
				return await fetchExampleTool(args);
			case 'configure_fetch':
				return await configureFetchTool(args);
			default:
				throw new Error(`Unknown tool: ${name}`);
		}
	});

	/**
	 * Start the MCP server using stdio transport
	 */
	const transport = new StdioServerTransport();
	await server.connect(transport);

	/**
	 * Handle graceful shutdown on SIGINT (Ctrl+C)
	 */
	process.on('SIGINT', async () => {
		await server.close();
		process.exit(0);
	});
}

// Start the application
main().catch(console.error);
