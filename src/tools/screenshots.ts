/**
 * * List Screenshots tool — finds captures that have screenshots via CDX cross-reference.
 */
import * as z from "zod";
import { CdxResponse } from "../schemas.ts";
import { HttpError } from "../utils/http.ts";
import { formatTimestamp } from "../utils/validation.ts";
import type { ToolContext } from "./context.ts";

export const ListScreenshots = z.object({
    url: z.url().meta({ description: "The URL to find screenshots for" }),
    limit: z
        .int()
        .min(1)
        .default(10)
        .meta({ description: "Maximum number of screenshot results" }),
});

export type ListScreenshots = z.input<typeof ListScreenshots>;

interface ScreenshotResult {
    timestamp: string;
    date: string;
    screenshotUrl: string;
    originalUrl: string;
}

interface ListScreenshotsResult {
    success: boolean;
    message: string;
    totalScreenshots: number;
    screenshots?: ScreenshotResult[];
}

/**
 * List available screenshots for a URL by cross-referencing the CDX API.
 * Screenshots are stored at web.archive.org/screenshot/{url}/* and are
 * generated when captures are made with capture_screenshot=1.
 */
export async function listScreenshots(
    input: ListScreenshots,
    ctx: ToolContext
): Promise<ListScreenshotsResult> {
    const { url, limit } = input;

    try {
        // Search for screenshot entries in CDX
        const screenshotPrefix = `web.archive.org/screenshot/${url}/*`;
        const cdxUrl = new URL("https://web.archive.org/cdx/search/cdx");
        cdxUrl.searchParams.set("url", screenshotPrefix);
        cdxUrl.searchParams.set("output", "json");
        cdxUrl.searchParams.set("limit", String(limit));
        cdxUrl.searchParams.set("fl", "timestamp,original");

        const data = await ctx.fetchJSON(cdxUrl.toString(), CdxResponse);

        // First row is headers
        if (data.length <= 1) {
            return {
                success: true,
                message: `No screenshots found for ${url}`,
                totalScreenshots: 0,
                screenshots: [],
            };
        }

        const screenshots: ScreenshotResult[] = data
            .slice(1)
            .filter((row) => row[0] !== undefined && row[0].length >= 14)
            .map((row) => {
                const ts = String(row[0]);
                return {
                    timestamp: ts,
                    date: formatTimestamp(ts),
                    screenshotUrl: `https://web.archive.org/web/${ts}im_/${url}`,
                    originalUrl: row[1] ?? "",
                };
            });

        return {
            success: true,
            message: `Found ${screenshots.length.toString()} screenshot(s) for ${url}`,
            totalScreenshots: screenshots.length,
            screenshots,
        };
    } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
            return {
                success: true,
                message: `No screenshots found for ${url}`,
                totalScreenshots: 0,
                screenshots: [],
            };
        }

        if (error instanceof HttpError) {
            return {
                success: false,
                message: `Failed to list screenshots: ${error.message}`,
                totalScreenshots: 0,
            };
        }

        return {
            success: false,
            message: `Failed to list screenshots: ${error instanceof Error ? error.message : "Unknown error"}`,
            totalScreenshots: 0,
        };
    }
}
