/**
 * Check Archive Status tool — Check if a URL has been archived
 */

import { z } from "zod";
import { cachingFetcher } from "../utils/cache.js";
import { HttpError } from "../utils/http.js";
import { waybackRateLimiter } from "../utils/rate-limit.js";
import { validateUrl } from "../utils/validation.js";

const SparklineResponseSchema = z.object({
	first_ts: z.string().optional(),
	last_ts: z.string().optional(),
	years: z.record(z.string(), z.array(z.number())).optional(),
	captures: z.number().optional(),
});

const AvailabilitySnapshotSchema = z.object({
	available: z.boolean(),
	timestamp: z.string(),
	url: z.string().optional(),
});

const AvailabilityResponseSchema = z.object({
	archivedSnapshots: z
		.object({
			closest: AvailabilitySnapshotSchema.optional(),
		})
		.optional(),
	archived_snapshots: z
		.object({
			closest: AvailabilitySnapshotSchema.optional(),
		})
		.optional(),
});

export const CheckArchiveStatusSchema = z.object({
	url: z.url().describe("The URL to check"),
});

export type CheckArchiveStatusInput = z.infer<typeof CheckArchiveStatusSchema>;

interface StatusResult {
	success: boolean;
	message: string;
	isArchived: boolean;
	firstCapture?: string;
	lastCapture?: string;
	totalCaptures?: number;
	yearlyCaptures?: Record<string, number>;
}

const USER_AGENT = "mcp-wayback-machine/2.0.0";

function formatTimestamp(ts: string): string {
	if (ts.length >= 8) {
		const year = ts.substring(0, 4);
		const month = ts.substring(4, 6);
		const day = ts.substring(6, 8);
		return `${year}-${month}-${day}`;
	}
	return ts;
}

/**
 * Check if a URL has been archived and get statistics
 */
export async function checkArchiveStatus(
	input: CheckArchiveStatusInput,
): Promise<StatusResult> {
	const { url } = input;

	try {
		const validatedUrl = validateUrl(url);

		await waybackRateLimiter.waitForSlot();

		// Use the Sparkline API for statistics
		const apiUrl = new URL("https://web.archive.org/__wb/sparkline");
		apiUrl.searchParams.set("url", validatedUrl);
		apiUrl.searchParams.set("collection", "web");
		apiUrl.searchParams.set("output", "json");

		waybackRateLimiter.recordRequest();
		const response = await cachingFetcher.fetch(apiUrl.toString(), {
			headers: {
				"User-Agent": USER_AGENT,
			},
		});

		const text = await response.text();
		const data = SparklineResponseSchema.parse(JSON.parse(text));

		if (data.first_ts !== undefined) {
			// Calculate yearly totals
			const yearlyCaptures: Record<string, number> = {};
			if (data.years !== undefined) {
				for (const [year, months] of Object.entries(data.years)) {
					yearlyCaptures[year] = months.reduce(
						(sum, count) => sum + count,
						0,
					);
				}
			}

			const result: StatusResult = {
				success: true,
				message: `${validatedUrl} has been archived ${String(data.captures ?? 0)} times`,
				isArchived: true,
				firstCapture: formatTimestamp(data.first_ts),
				totalCaptures: data.captures ?? 0,
				yearlyCaptures,
			};
			if (data.last_ts !== undefined) {
				result.lastCapture = formatTimestamp(data.last_ts);
			}
			return result;
		}

		// Fallback to availability API
		const availUrl = new URL("https://archive.org/wayback/available");
		availUrl.searchParams.set("url", validatedUrl);

		waybackRateLimiter.recordRequest();
		const availResponse = await cachingFetcher.fetch(availUrl.toString(), {
			headers: {
				"User-Agent": USER_AGENT,
			},
		});

		const availText = await availResponse.text();
		const availData = AvailabilityResponseSchema.parse(
			JSON.parse(availText),
		);

		const closest =
			availData.archived_snapshots?.closest ??
			availData.archivedSnapshots?.closest;

		if (closest?.available) {
			return {
				success: true,
				message: `${validatedUrl} has been archived`,
				isArchived: true,
				lastCapture: closest.timestamp,
			};
		}

		return {
			success: true,
			message: `${validatedUrl} has not been archived`,
			isArchived: false,
			totalCaptures: 0,
		};
	} catch (error) {
		if (error instanceof HttpError) {
			if (error.status === 404) {
				return {
					success: true,
					message: `${url} has not been archived`,
					isArchived: false,
					totalCaptures: 0,
				};
			}
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
