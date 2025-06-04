#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Tool schemas
const SaveUrlSchema = z.object({
	url: z.string().url().describe('The URL to save to the Wayback Machine'),
});

const GetArchivedUrlSchema = z.object({
	url: z.string().url().describe('The URL to retrieve from the Wayback Machine'),
	timestamp: z
		.string()
		.optional()
		.describe('Specific timestamp (YYYYMMDDhhmmss) or "latest" for most recent'),
});

const SearchArchivesSchema = z.object({
	url: z.string().url().describe('The URL pattern to search for'),
	from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
	to: z.string().optional().describe('End date (YYYY-MM-DD)'),
	limit: z.number().optional().default(10).describe('Maximum number of results'),
});

const CheckArchiveStatusSchema = z.object({
	url: z.string().url().describe('The URL to check'),
});

// Create server instance
const server = new Server(
	{
		name: 'mcp-wayback-machine',
		version: '0.1.0',
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
			{
				name: 'save_url',
				description: 'Save a URL to the Wayback Machine',
				inputSchema: SaveUrlSchema,
			},
			{
				name: 'get_archived_url',
				description: 'Retrieve an archived version of a URL',
				inputSchema: GetArchivedUrlSchema,
			},
			{
				name: 'search_archives',
				description: 'Search the Wayback Machine archives for a URL',
				inputSchema: SearchArchivesSchema,
			},
			{
				name: 'check_archive_status',
				description: 'Check if a URL has been archived',
				inputSchema: CheckArchiveStatusSchema,
			},
		],
	};
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	switch (name) {
		case 'save_url': {
			const { url } = SaveUrlSchema.parse(args);
			// TODO: Implement save URL functionality
			return {
				content: [
					{
						type: 'text',
						text: `URL ${url} would be saved to Wayback Machine (not implemented yet)`,
					},
				],
			};
		}

		case 'get_archived_url': {
			const { url, timestamp } = GetArchivedUrlSchema.parse(args);
			// TODO: Implement get archived URL functionality
			return {
				content: [
					{
						type: 'text',
						text: `Would retrieve archived version of ${url} at ${timestamp || 'latest'} (not implemented yet)`,
					},
				],
			};
		}

		case 'search_archives': {
			const { url, from, to, limit } = SearchArchivesSchema.parse(args);
			// TODO: Implement search functionality
			return {
				content: [
					{
						type: 'text',
						text: `Would search archives for ${url} from ${from || 'any'} to ${to || 'any'} with limit ${limit} (not implemented yet)`,
					},
				],
			};
		}

		case 'check_archive_status': {
			const { url } = CheckArchiveStatusSchema.parse(args);
			// TODO: Implement status check functionality
			return {
				content: [
					{
						type: 'text',
						text: `Would check archive status for ${url} (not implemented yet)`,
					},
				],
			};
		}

		default:
			throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
	}
});

// Start the server
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('MCP Wayback Machine server running on stdio');
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
