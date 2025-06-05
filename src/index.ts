#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import tools
import { SaveUrlSchema, saveUrl } from './tools/save.js';
import { GetArchivedUrlSchema, getArchivedUrl } from './tools/retrieve.js';
import { SearchArchivesSchema, searchArchives } from './tools/search.js';
import { CheckArchiveStatusSchema, checkArchiveStatus } from './tools/status.js';

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

	try {
		switch (name) {
			case 'save_url': {
				const input = SaveUrlSchema.parse(args);
				const result = await saveUrl(input);
				
				let text = result.message;
				if (result.archivedUrl) {
					text += `\n\nArchived URL: ${result.archivedUrl}`;
				}
				if (result.timestamp) {
					text += `\nTimestamp: ${result.timestamp}`;
				}
				if (result.jobId) {
					text += `\nJob ID: ${result.jobId}`;
				}
				
				return {
					content: [{ type: 'text', text }],
				};
			}

			case 'get_archived_url': {
				const input = GetArchivedUrlSchema.parse(args);
				const result = await getArchivedUrl(input);
				
				let text = result.message;
				if (result.archivedUrl) {
					text += `\n\nArchived URL: ${result.archivedUrl}`;
				}
				if (result.timestamp) {
					text += `\nTimestamp: ${result.timestamp}`;
				}
				if (result.available !== undefined) {
					text += `\nAvailable: ${result.available ? 'Yes' : 'No'}`;
				}
				
				return {
					content: [{ type: 'text', text }],
				};
			}

			case 'search_archives': {
				const input = SearchArchivesSchema.parse(args);
				const result = await searchArchives(input);
				
				let text = result.message;
				if (result.results && result.results.length > 0) {
					text += '\n\nResults:';
					for (const archive of result.results) {
						text += `\n\n- Date: ${archive.date}`;
						text += `\n  URL: ${archive.archivedUrl}`;
						text += `\n  Status: ${archive.statusCode}`;
						text += `\n  Type: ${archive.mimeType}`;
					}
				}
				
				return {
					content: [{ type: 'text', text }],
				};
			}

			case 'check_archive_status': {
				const input = CheckArchiveStatusSchema.parse(args);
				const result = await checkArchiveStatus(input);
				
				let text = result.message;
				if (result.isArchived) {
					if (result.firstCapture) {
						text += `\n\nFirst captured: ${result.firstCapture}`;
					}
					if (result.lastCapture) {
						text += `\nLast captured: ${result.lastCapture}`;
					}
					if (result.totalCaptures !== undefined) {
						text += `\nTotal captures: ${result.totalCaptures}`;
					}
					if (result.yearlyCaptures && Object.keys(result.yearlyCaptures).length > 0) {
						text += '\n\nCaptures by year:';
						for (const [year, count] of Object.entries(result.yearlyCaptures)) {
							text += `\n  ${year}: ${count}`;
						}
					}
				}
				
				return {
					content: [{ type: 'text', text }],
				};
			}

			default:
				throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
		}
	} catch (error) {
		if (error instanceof McpError) {
			throw error;
		}
		
		throw new McpError(
			ErrorCode.InternalError,
			error instanceof Error ? error.message : 'Unknown error occurred',
		);
	}
});

// Start the server
async function main() {
	// Check if running as CLI (has TTY or has arguments beyond node and script)
	const isCliMode = process.stdin.isTTY || process.argv.length > 2;
	
	if (isCliMode && process.argv.length > 2) {
		// Running as CLI tool
		const { createCLI } = await import('./cli.js');
		const program = createCLI();
		await program.parseAsync(process.argv);
	} else {
		// Running as MCP server
		const transport = new StdioServerTransport();
		await server.connect(transport);
		console.error('MCP Wayback Machine server running on stdio');
	}
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});