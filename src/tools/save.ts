/**
 * Save URL tool — Archives a URL to the Wayback Machine via SPN2 API.
 * Supports authentication for higher rate limits and optional capture options.
 */

import * as z from "zod";
import { SaveJobResponse } from "../schemas.ts";
import { HttpError } from "../utils/http.ts";

import type { ToolContext } from "./context.ts";

export const SaveUrl = z.object({
    url: z
        .url()
        .meta({ description: "The URL to save to the Wayback Machine" }),
    captureScreenshot: z.boolean().optional().meta({
        description:
            "Capture a screenshot of the page as a PNG image (uses the im_ modifier)",
    }),
    captureOutlinks: z.boolean().optional().meta({
        description:
            "Also archive up to 100 outlink pages linked from this URL",
    }),
    ifNotArchivedWithin: z.string().trim().optional().meta({
        description:
            'Skip if archived within timeframe, e.g. "30d" (30 days), "1h" (1 hour)',
    }),
    jsBehaviorTimeout: z.int().min(0).max(30).optional().meta({
        description: "Run JavaScript for N seconds before capturing (max 30)",
    }),
    forceGet: z.boolean().optional().meta({
        description:
            "Use simple HTTP GET instead of browser rendering (faster but no JS)",
    }),
    delayWbAvailability: z.boolean().optional().meta({
        description: "Delay indexing ~12 hours to reduce server load",
    }),
});

export type SaveUrl = z.output<typeof SaveUrl>;

interface SaveResult {
    success: boolean;
    message: string;
    jobId?: string;
    archivedUrl?: string;
    timestamp?: string;
}

/**

 * * Save a URL to the Wayback Machine using the SPN2 API.

 */
export async function saveUrl(
    input: SaveUrl,
    ctx: ToolContext
): Promise<SaveResult> {
    const {
        url,
        captureScreenshot,
        captureOutlinks,
        ifNotArchivedWithin,
        jsBehaviorTimeout,
        forceGet,
        delayWbAvailability,
    } = input;

    try {
        // Build form data for SPN2 API
        const params = new URLSearchParams();
        params.set("url", url);

        if (captureScreenshot === true) {
            params.set("capture_screenshot", "1");
        }
        if (captureOutlinks === true) {
            params.set("capture_outlinks", "1");
        }
        if (ifNotArchivedWithin !== undefined) {
            params.set("if_not_archived_within", ifNotArchivedWithin);
        }
        if (jsBehaviorTimeout !== undefined) {
            params.set("js_behavior_timeout", String(jsBehaviorTimeout));
        }
        if (forceGet === true) {
            params.set("force_get", "1");
        }
        if (delayWbAvailability === true) {
            params.set("delay_wb_availability", "1");
        }

        const response = await ctx.fetch("https://web.archive.org/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body: params.toString(),
            timeout: 60000,
        });

        const text = await response.text();

        // Try parsing as JSON
        try {
            const data = SaveJobResponse.parse(JSON.parse(text));

            const result: SaveResult = {
                success: true,
                message:
                    data.message ??
                    `Successfully submitted ${url} for archiving`,
            };

            if (data.job_id !== undefined) {
                result.jobId = data.job_id;
            }
            if (data.url !== undefined) {
                result.archivedUrl = data.url;
            }
            if (data.timestamp !== undefined) {
                result.timestamp = data.timestamp;
            }

            return result;
        } catch {
            // Non-JSON response — the save may have been submitted
            // Try extracting from Location header
            const location = response.headers.get("Location");
            const contentLocation = response.headers.get("Content-Location");
            const archivedPath = location ?? contentLocation;

            if (archivedPath?.includes("/web/") === true) {
                const match = /\/web\/(\d{14})\//.exec(archivedPath);
                const result: SaveResult = {
                    success: true,
                    message: `Successfully submitted ${url} for archiving`,
                    archivedUrl: `https://web.archive.org${archivedPath}`,
                };
                if (match?.[1] !== undefined) {
                    result.timestamp = match[1];
                }
                return result;
            }

            return {
                success: true,
                message: `Successfully submitted ${url} for archiving. Check status in a few moments.`,
            };
        }
    } catch (error) {
        if (error instanceof HttpError) {
            if (error.status === 429) {
                return {
                    success: false,
                    message: "Rate limit exceeded. Please try again later.",
                };
            }
            return {
                success: false,
                message: `Failed to save URL: ${error.message}`,
            };
        }

        return {
            success: false,
            message: `Failed to save URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}
