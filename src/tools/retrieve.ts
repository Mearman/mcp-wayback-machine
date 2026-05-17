/**
 * Retrieve tool ΓÇö resolves archived URLs and fetches snapshot content.
 * Supports URL modifiers (id_, im_, js_, cs_) for different content views.
 */

import * as z from "zod";
import { AvailabilityResponse } from "../schemas.ts";
import { HttpError } from "../utils/http.ts";
import { capContent, HttpUrl, Timestamp } from "../utils/validation.ts";

import type { ToolContext } from "./context.ts";

export const GetArchivedUrl = z.object({
    url: HttpUrl.meta({
        description: "The URL to retrieve from the Wayback Machine",
    }),
    timestamp: z
        .union([z.literal("latest"), Timestamp])
        .optional()
        .meta({
            description:
                'Specific timestamp (YYYYMMDDhhmmss) or "latest" for most recent',
        }),
    modifier: z.enum(["id_", "im_", "js_", "cs_"]).optional().meta({
        description:
            "URL modifier: id_ (raw content, no toolbar), im_ (screenshot image), js_ (JavaScript), cs_ (CSS). Default: id_",
    }),
});

export type GetArchivedUrl = z.output<typeof GetArchivedUrl>;

interface RetrieveResult {
    success: boolean;
    message: string;
    archivedUrl?: string;
    timestamp?: string;
    available?: boolean;
    content?: string;
    contentType?: string;
}

/**

 * * Get an archived version of a URL, optionally fetching the snapshot content.

 */
export async function getArchivedUrl(
    input: GetArchivedUrl,
    ctx: ToolContext
): Promise<RetrieveResult> {
    const { url, timestamp, modifier } = input;

    try {
        const apiUrl = new URL("https://archive.org/wayback/available");
        apiUrl.searchParams.set("url", url);
        if (timestamp !== undefined && timestamp !== "latest") {
            apiUrl.searchParams.set("timestamp", timestamp);
        }

        const data = await ctx.fetchJSON(
            apiUrl.toString(),
            AvailabilityResponse
        );

        if (data.archived_snapshots.closest?.available) {
            const snapshot = data.archived_snapshots.closest;
            const mod = modifier ?? "id_";

            // Reconstruct the archived URL with the requested modifier.
            // `ts` comes from the Wayback availability API (server-controlled,
            // 14-digit string); `url` was validated by HttpUrl.
            const ts = snapshot.timestamp;
            const snapshotUrl = `https://web.archive.org/web/${ts}${mod}/${url}`;

            // Fetch the actual snapshot content
            const snapshotResponse = await ctx.fetch(snapshotUrl);
            const body = await snapshotResponse.text();
            const contentType =
                snapshotResponse.headers.get("Content-Type") ?? "text/html";

            return {
                success: true,
                message: `Found archived version of ${url}`,
                archivedUrl: snapshotUrl,
                timestamp: ts,
                available: true,
                content: capContent(body),
                contentType,
            };
        }

        // If no snapshot found, try direct construction for specific timestamps.
        // `timestamp` here has been validated by the Timestamp schema (14 digits)
        // so it can't inject extra path segments into the URL.
        if (timestamp !== undefined && timestamp !== "latest") {
            const mod = modifier ?? "id_";
            const directUrl = `https://web.archive.org/web/${timestamp}${mod}/${url}/`;

            try {
                const directResponse = await ctx.fetch(directUrl);
                const body = await directResponse.text();
                const contentType =
                    directResponse.headers.get("Content-Type") ?? "text/html";

                return {
                    success: true,
                    message:
                        "Retrieved snapshot via direct URL (availability API had no match)",
                    archivedUrl: directUrl,
                    timestamp,
                    available: false,
                    content: capContent(body),
                    contentType,
                };
            } catch {
                // Direct fetch also failed
                return {
                    success: true,
                    message: `No archived version found for ${url} at ${timestamp}`,
                    archivedUrl: directUrl,
                    timestamp,
                    available: false,
                };
            }
        }

        return {
            success: false,
            message: `No archived versions found for ${url}`,
            available: false,
        };
    } catch (error) {
        if (error instanceof HttpError) {
            return {
                success: false,
                message: `Failed to retrieve archived URL: ${error.message}`,
            };
        }

        return {
            success: false,
            message: `Failed to retrieve archived URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}
