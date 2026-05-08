/**
 * Get Archived URL tool — Retrieves archived versions of URLs
 */

import { z } from "zod";
import { cachingFetcher } from "../utils/cache.js";
import { HttpError } from "../utils/http.js";
import { waybackRateLimiter } from "../utils/rate-limit.js";
import {
	timestampSchema,
	validateInput,
	validateUrl,
} from "../utils/validation.js";

export const GetArchivedUrlSchema = z.object({
	url: z.url().describe("The URL to retrieve from the Wayback Machine"),
	timestamp: z
		.string()
		.optional()
		.describe(
			'Specific timestamp (YYYYMMDDhhmmss) or "latest" for most recent',
		),
});

export type GetArchivedUrlInput = z.infer<typeof GetArchivedUrlSchema>;

const AvailabilityResponseSchema = z.object({
	url: z.string(),
	archived_snapshots: z.object({
		closest: z
			.object({
				status: z.string(),
				available: z.boolean(),
				url: z.string(),
				timestamp: z.string(),
			})
			.optional(),
	}),
});

interface RetrieveResult {
	success: boolean;
	message: string;
	archivedUrl?: string;
	timestamp?: string;
	available?: boolean;
}

const USER_AGENT = "mcp-wayback-machine/2.0.0";

/**
 * Get an archived version of a URL
 */
export async function getArchivedUrl(
	input: GetArchivedUrlInput,
): Promise<RetrieveResult> {
	const { url, timestamp } = input;

	try {
		const validatedUrl = validateUrl(url);
		const validatedTimestamp =
			timestamp !== undefined && timestamp !== "latest"
				? validateInput(timestampSchema, timestamp)
				: timestamp;

		await waybackRateLimiter.waitForSlot();

		const apiUrl = new URL("https://archive.org/wayback/available");
		apiUrl.searchParams.set("url", validatedUrl);
		if (validatedTimestamp !== undefined) {
			apiUrl.searchParams.set("timestamp", validatedTimestamp);
		}

		waybackRateLimiter.recordRequest();
		const response = await cachingFetcher.fetch(apiUrl.toString(), {
			headers: {
				"User-Agent": USER_AGENT,
			},
		});

		const text = await response.text();
		const data = AvailabilityResponseSchema.parse(JSON.parse(text));

		if (data.archived_snapshots.closest?.available) {
			const snapshot = data.archived_snapshots.closest;
			return {
				success: true,
				message: `Found archived version of ${validatedUrl}`,
				archivedUrl: snapshot.url,
				timestamp: snapshot.timestamp,
				available: true,
			};
		}

		// If no snapshot found, try direct construction
		if (
			validatedTimestamp !== undefined &&
			validatedTimestamp !== "latest"
		) {
			const directUrl = `https://web.archive.org/web/${validatedTimestamp}/${validatedUrl}/`;
			return {
				success: true,
				message:
					"No confirmed archive found. You can try this URL directly:",
				archivedUrl: directUrl,
				timestamp: validatedTimestamp,
				available: false,
			};
		}

		return {
			success: false,
			message: `No archived versions found for ${validatedUrl}`,
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
