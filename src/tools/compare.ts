/**
 * Compare tool ΓÇö diffs two archived snapshots using Wayback Changes.
 * Fetches raw content of both snapshots and provides a visual diff URL.
 */

import * as z from "zod";
import { CdxResponse } from "../schemas.ts";
import { HttpError } from "../utils/http.ts";
import {
    HttpUrl,
    Timestamp,
    formatTimestamp,
} from "../utils/validation.ts";
import type { ToolContext } from "./context.ts";

export const CompareSnapshots = z.object({
    url: HttpUrl.meta({ description: "The URL to compare snapshots for" }),
    timestampA: Timestamp.optional().meta({
        description:
            "First timestamp (YYYYMMDDhhmmss). Defaults to oldest available.",
    }),
    timestampB: Timestamp.optional().meta({
        description:
            "Second timestamp (YYYYMMDDhhmmss). Defaults to newest available.",
    }),
});

export type CompareSnapshots = z.output<typeof CompareSnapshots>;

interface SnapshotInfo {
    timestamp: string;
    date: string;
    url: string;
}

interface CompareResult {
    success: boolean;
    message: string;
    snapshotA?: SnapshotInfo;
    snapshotB?: SnapshotInfo;
    changesUrl?: string;
    contentA?: string;
    contentB?: string;
}

/**
 * Compare two archived snapshots of a URL.
 * Fetches the snapshot content for both timestamps and returns them
 * for comparison. Also provides the Wayback Changes visual diff URL.
 */
export async function compareSnapshots(
    input: CompareSnapshots,
    ctx: ToolContext
): Promise<CompareResult> {
    const { url, timestampA, timestampB } = input;

    try {
        // If both timestamps provided, fetch both snapshots directly.
        // Both values have been validated against the Timestamp schema
        // (14 digits) so they can be safely interpolated into the URL path.
        if (timestampA !== undefined && timestampB !== undefined) {
            const snapshotAUrl = `https://web.archive.org/web/${timestampA}id_/${url}`;
            const snapshotBUrl = `https://web.archive.org/web/${timestampB}id_/${url}`;

            const [responseA, responseB] = await Promise.all([
                ctx.fetch(snapshotAUrl),
                ctx.fetch(snapshotBUrl),
            ]);

            const [contentA, contentB] = await Promise.all([
                responseA.text(),
                responseB.text(),
            ]);

            return {
                success: true,
                message: `Comparing snapshots of ${url}`,
                snapshotA: {
                    timestamp: timestampA,
                    date: formatTimestamp(timestampA),
                    url: snapshotAUrl,
                },
                snapshotB: {
                    timestamp: timestampB,
                    date: formatTimestamp(timestampB),
                    url: snapshotBUrl,
                },
                changesUrl: `https://web.archive.org/web/changes/${encodeURIComponent(url)}`,
                contentA,
                contentB,
            };
        }

        // Find available snapshots via CDX API to pick the boundary timestamps
        const cdxUrl = new URL("https://web.archive.org/cdx/search/cdx");
        cdxUrl.searchParams.set("url", url);
        cdxUrl.searchParams.set("output", "json");
        cdxUrl.searchParams.set("fl", "timestamp,statuscode");
        cdxUrl.searchParams.set("filter", "statuscode:200");
        cdxUrl.searchParams.set("limit", "-2");

        const data = await ctx.fetchJSON(cdxUrl.toString(), CdxResponse);

        // First row is headers, need at least 2 data rows
        if (data.length < 3) {
            return {
                success: false,
                message: `Not enough archived snapshots found for ${url} to compare. Need at least 2 snapshots with status 200.`,
            };
        }

        const rows = data.slice(1);
        const oldestTs = rows[0]?.[0];
        const newestTs = rows[rows.length - 1]?.[0];

        if (oldestTs === undefined || newestTs === undefined) {
            return {
                success: false,
                message: `Could not determine snapshot timestamps for ${url}`,
            };
        }

        // Recurse with the resolved timestamps
        return await compareSnapshots(
            { url, timestampA: oldestTs, timestampB: newestTs },
            ctx
        );
    } catch (error) {
        if (error instanceof HttpError) {
            return {
                success: false,
                message: `Failed to compare snapshots: ${error.message}`,
            };
        }

        return {
            success: false,
            message: `Failed to compare snapshots: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}
