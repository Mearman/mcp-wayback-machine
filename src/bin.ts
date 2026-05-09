#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { GetArchivedUrl, getArchivedUrl } from "./tools/retrieve.ts";
import { SaveUrl, saveUrl } from "./tools/save.ts";
import { SearchArchives, searchArchives } from "./tools/search.ts";
import { CheckArchiveStatus, checkArchiveStatus } from "./tools/status.ts";
import { ListScreenshots, listScreenshots } from "./tools/screenshots.ts";
import { ClearCache, clearCache } from "./tools/cache.ts";
import { CompareSnapshots, compareSnapshots } from "./tools/compare.ts";
import { context } from "./contexts.ts";

import pkg from "../package.json" with { type: "json" };

const VERSION = pkg.version;

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
            "Interact with the Internet Archive's Wayback Machine to save, retrieve, search, and check the archival status of URLs. " +
            "Supports screenshot retrieval, full CDX search with filtering/pagination, " +
            "and optional authentication for higher rate limits.",
    }
);

server.registerTool(
    "save_url",
    {
        description:
            "Save a URL to the Wayback Machine for archival using the SPN2 API. " +
            "Supports capturing screenshots, outlinks, and conditional archiving. " +
            "Set WAYBACK_ACCESS_KEY and WAYBACK_SECRET_KEY env vars for higher rate limits.",
        inputSchema: SaveUrl,
    },
    async (args) => {
        const result = await saveUrl(args, context);

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

        return { content: [{ type: "text", text }] };
    }
);

server.registerTool(
    "get_archived_url",
    {
        description:
            "Retrieve an archived version of a URL from the Wayback Machine. " +
            "Returns the snapshot content. Supports URL modifiers: " +
            "id_ (raw content), im_ (screenshot image), js_ (JavaScript), cs_ (CSS).",
        inputSchema: GetArchivedUrl,
    },
    async (args) => {
        const result = await getArchivedUrl(args, context);

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
        if (result.content !== undefined) {
            text += `\n\nContent-Type: ${result.contentType ?? "unknown"}`;
            text += `\n\n${result.content}`;
        }

        return { content: [{ type: "text", text }] };
    }
);

server.registerTool(
    "search_archives",
    {
        description:
            "Search the Wayback Machine CDX API for archived versions of a URL. " +
            "Supports match types (exact/prefix/host/domain), date range filtering, " +
            "collapsing duplicates, field filtering, pagination, and duplicate counting.",
        inputSchema: SearchArchives,
    },
    async (args) => {
        const result = await searchArchives(args, context);

        let text = result.message;
        if (result.results !== undefined && result.results.length > 0) {
            text += "\n\nResults:";
            for (const archive of result.results) {
                text += `\n\n- Date: ${archive.date}`;
                text += `\n  URL: ${archive.archivedUrl}`;
                text += `\n  Status: ${archive.statusCode}`;
                text += `\n  Type: ${archive.mimeType}`;
                if (archive.duplicateCount !== undefined) {
                    text += `\n  Duplicates: ${String(archive.duplicateCount)}`;
                }
            }
        }

        return { content: [{ type: "text", text }] };
    }
);

server.registerTool(
    "check_archive_status",
    {
        description:
            "Check if a URL has been archived by the Wayback Machine and get capture " +
            "statistics including yearly breakdowns.",
        inputSchema: CheckArchiveStatus,
    },
    async (args) => {
        const result = await checkArchiveStatus(args, context);

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
                    result.yearlyCaptures
                )) {
                    text += `\n  ${year}: ${String(count)}`;
                }
            }
        }

        return { content: [{ type: "text", text }] };
    }
);

server.registerTool(
    "list_screenshots",
    {
        description:
            "List available screenshots for a URL from the Wayback Machine. " +
            "Screenshots are generated when captures are made with capture_screenshot=1.",
        inputSchema: ListScreenshots,
    },
    async (args) => {
        const result = await listScreenshots(args, context);

        let text = result.message;
        if (result.screenshots !== undefined && result.screenshots.length > 0) {
            text += "\n\nScreenshots:";
            for (const screenshot of result.screenshots) {
                text += `\n\n- Date: ${screenshot.date}`;
                text += `\n  Screenshot: ${screenshot.screenshotUrl}`;
                text += `\n  Original: ${screenshot.originalUrl}`;
            }
        }

        return { content: [{ type: "text", text }] };
    }
);

server.registerTool(
    "clear_cache",
    {
        description:
            "Clear all cached Wayback Machine API responses. " +
            "Use when fresh data is needed or after saving a URL.",
        inputSchema: ClearCache,
    },
    async () => {
        const result = await clearCache();
        return { content: [{ type: "text", text: result.message }] };
    }
);

server.registerTool(
    "compare_snapshots",
    {
        description:
            "Compare two archived snapshots of a URL. " +
            "Fetches the raw content of both snapshots and provides a visual diff URL. " +
            "If no timestamps specified, compares the oldest and newest available snapshots.",
        inputSchema: CompareSnapshots,
    },
    async (args) => {
        const result = await compareSnapshots(args, context);

        let text = result.message;
        if (result.snapshotA !== undefined && result.snapshotB !== undefined) {
            text += `\n\nSnapshot A: ${result.snapshotA.date} (${result.snapshotA.timestamp})`;
            text += `\nSnapshot B: ${result.snapshotB.date} (${result.snapshotB.timestamp})`;
        }
        if (result.changesUrl !== undefined) {
            text += `\n\nVisual diff: ${result.changesUrl}`;
        }
        if (result.contentA !== undefined) {
            text += `\n\n--- Snapshot A Content ---\n${result.contentA}`;
        }
        if (result.contentB !== undefined) {
            text += `\n\n--- Snapshot B Content ---\n${result.contentB}`;
        }

        return { content: [{ type: "text", text }] };
    }
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
