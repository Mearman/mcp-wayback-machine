#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { GetArchivedUrlSchema, getArchivedUrl } from "./tools/retrieve.js";
import { SaveUrlSchema, saveUrl } from "./tools/save.js";
import { SearchArchivesSchema, searchArchives } from "./tools/search.js";
import {
	CheckArchiveStatusSchema,
	checkArchiveStatus,
} from "./tools/status.js";

const VERSION = "2.0.0";

const server = new McpServer(
	{
		name: "mcp-wayback-machine",
		version: VERSION,
	},
	{
		capabilities: {
			tools: {},
		},
		instructions:
			"Interact with the Internet Archive's Wayback Machine to save, retrieve, search, and check the archival status of URLs.",
	},
);

server.registerTool(
	"save_url",
	{
		description:
			"Save a URL to the Wayback Machine for archival. Returns the archived URL and timestamp if successful.",
		inputSchema: SaveUrlSchema,
	},
	async (args) => {
		const input = SaveUrlSchema.parse(args);
		const result = await saveUrl(input);

		let text = result.message;
		if (result.archivedUrl !== undefined) {
			text += `\n\nArchived URL: ${result.archivedUrl}`;
		}
		if (result.timestamp !== undefined) {
			text += `\nTimestamp: ${result.timestamp}`;
		}
		if (result.jobId !== undefined) {
			text += `\nJob ID: ${result.jobId}`;
		}

		return {
			content: [{ type: "text", text }],
		};
	},
);

server.registerTool(
	"get_archived_url",
	{
		description:
			"Retrieve an archived version of a URL from the Wayback Machine. Optionally specify a timestamp.",
		inputSchema: GetArchivedUrlSchema,
	},
	async (args) => {
		const input = GetArchivedUrlSchema.parse(args);
		const result = await getArchivedUrl(input);

		let text = result.message;
		if (result.archivedUrl !== undefined) {
			text += `\n\nArchived URL: ${result.archivedUrl}`;
		}
		if (result.timestamp !== undefined) {
			text += `\nTimestamp: ${result.timestamp}`;
		}
		if (result.available !== undefined) {
			text += `\nAvailable: ${result.available ? "Yes" : "No"}`;
		}

		return {
			content: [{ type: "text", text }],
		};
	},
);

server.registerTool(
	"search_archives",
	{
		description:
			"Search the Wayback Machine CDX API for all archived versions of a URL. Supports date range filtering.",
		inputSchema: SearchArchivesSchema,
	},
	async (args) => {
		const input = SearchArchivesSchema.parse(args);
		const result = await searchArchives(input);

		let text = result.message;
		if (result.results !== undefined && result.results.length > 0) {
			text += "\n\nResults:";
			for (const archive of result.results) {
				text += `\n\n- Date: ${archive.date}`;
				text += `\n  URL: ${archive.archivedUrl}`;
				text += `\n  Status: ${archive.statusCode}`;
				text += `\n  Type: ${archive.mimeType}`;
			}
		}

		return {
			content: [{ type: "text", text }],
		};
	},
);

server.registerTool(
	"check_archive_status",
	{
		description:
			"Check if a URL has been archived by the Wayback Machine and get capture statistics including yearly breakdowns.",
		inputSchema: CheckArchiveStatusSchema,
	},
	async (args) => {
		const input = CheckArchiveStatusSchema.parse(args);
		const result = await checkArchiveStatus(input);

		let text = result.message;
		if (result.isArchived) {
			if (result.firstCapture !== undefined) {
				text += `\n\nFirst captured: ${result.firstCapture}`;
			}
			if (result.lastCapture !== undefined) {
				text += `\nLast captured: ${result.lastCapture}`;
			}
			if (result.totalCaptures !== undefined) {
				text += `\nTotal captures: ${String(result.totalCaptures)}`;
			}
			if (
				result.yearlyCaptures !== undefined &&
				Object.keys(result.yearlyCaptures).length > 0
			) {
				text += "\n\nCaptures by year:";
				for (const [year, count] of Object.entries(
					result.yearlyCaptures,
				)) {
					text += `\n  ${year}: ${String(count)}`;
				}
			}
		}

		return {
			content: [{ type: "text", text }],
		};
	},
);

async function main(): Promise<void> {
	const isCliMode = process.stdin.isTTY || process.argv.length > 2;

	if (isCliMode && process.argv.length > 2) {
		const { createCLI } = await import("./cli.js");
		const program = createCLI();
		await program.parseAsync(process.argv);
	} else {
		const transport = new StdioServerTransport();
		await server.connect(transport);
		console.error("MCP Wayback Machine server running on stdio");
	}
}

main().catch((error: unknown) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
