/**
 * * Check Archive Status tool — Checks archival statistics for URLs.
 */
import * as z from "zod";
import { AvailabilityResponse, SparklineResponse } from "../schemas.ts";
import { HttpError } from "../utils/http.ts";

import type { ToolContext } from "./context.ts";

export const CheckArchiveStatus = z.object({
    url: z.url().meta({ description: "The URL to check archival status for" }),
});

export type CheckArchiveStatus = z.output<typeof CheckArchiveStatus>;

interface StatusResult {
    success: boolean;
    message: string;
    isArchived: boolean;
    firstCapture?: string;
    lastCapture?: string;
    totalCaptures?: number;
    yearlyCaptures?: Record<string, number>;
}

/**

 * * Check if a URL has been archived and get capture statistics.

 */
export async function checkArchiveStatus(
    input: CheckArchiveStatus,
    ctx: ToolContext
): Promise<StatusResult> {
    const { url } = input;

    try {
        // Try sparkline API first for detailed statistics
        const sparklineUrl = `https://web.archive.org/__wb/sparkline?url=${encodeURIComponent(url)}&collection=web&output=json`;

        const sparklineData = await ctx.fetchJSON(
            sparklineUrl,
            SparklineResponse
        );

        if (sparklineData.years !== undefined) {
            const years = Object.keys(sparklineData.years).sort();
            if (years.length > 0) {
                const yearlyCaptures: Record<string, number> = {};
                let totalCaptures = 0;

                for (const year of years) {
                    const yearData = sparklineData.years[year];
                    if (!yearData) continue;
                    const count = yearData["timeseries-csp"].reduce(
                        (sum, val) => sum + val,
                        0
                    );
                    yearlyCaptures[year] = count;
                    totalCaptures += count;
                }

                // Get last capture date from availability API
                const availUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
                const availData = await ctx.fetchJSON(
                    availUrl,
                    AvailabilityResponse
                );

                const result: StatusResult = {
                    success: true,
                    message: `Archive status for ${url}`,
                    isArchived: true,
                    firstCapture: `${String(years[0])}-01-01`,
                    totalCaptures,
                    yearlyCaptures,
                };

                if (
                    availData.archived_snapshots.closest?.timestamp !==
                    undefined
                ) {
                    const ts = availData.archived_snapshots.closest.timestamp;
                    result.lastCapture = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
                }

                return result;
            }
        }

        // Fall back to availability API
        const availUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
        const availData = await ctx.fetchJSON(availUrl, AvailabilityResponse);

        if (availData.archived_snapshots.closest?.available) {
            const snapshot = availData.archived_snapshots.closest;
            return {
                success: true,
                message: `${url} has been archived`,
                isArchived: true,
                lastCapture: `${snapshot.timestamp.slice(0, 4)}-${snapshot.timestamp.slice(4, 6)}-${snapshot.timestamp.slice(6, 8)}`,
            };
        }

        return {
            success: true,
            message: `${url} has not been archived`,
            isArchived: false,
        };
    } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
            return {
                success: true,
                message: `${url} has not been archived`,
                isArchived: false,
            };
        }

        if (error instanceof HttpError) {
            return {
                success: false,
                message: `Failed to check archive status: ${error.message}`,
                isArchived: false,
            };
        }

        return {
            success: false,
            message: `Failed to check archive status: ${error instanceof Error ? error.message : "Unknown error"}`,
            isArchived: false,
        };
    }
}
