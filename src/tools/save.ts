/**
 * Save URL tool — Archives a URL to the Wayback Machine
 */

import { z } from "zod";
import { HttpError, fetchWithTimeout } from "../utils/http.js";
import { waybackRateLimiter } from "../utils/rate-limit.js";
import { validateUrl } from "../utils/validation.js";

export const SaveUrlSchema = z.object({
	url: z.url().describe("The URL to save to the Wayback Machine"),
});

export type SaveUrlInput = z.infer<typeof SaveUrlSchema>;

const SaveResponseSchema = z.object({
	url: z.string(),
	job_id: z.string(),
	timestamp: z.string().optional(),
});

interface SaveResult {
	success: boolean;
	message: string;
	jobId?: string;
	archivedUrl?: string;
	timestamp?: string;
}

const USER_AGENT = "mcp-wayback-machine/2.0.0";

/**
 * Save a URL to the Wayback Machine
 */
export async function saveUrl(input: SaveUrlInput): Promise<SaveResult> {
	const { url } = input;

	try {
		const validatedUrl = validateUrl(url);

		await waybackRateLimiter.waitForSlot();

		const saveApiUrl = `https://web.archive.org/save/${encodeURIComponent(validatedUrl)}`;

		waybackRateLimiter.recordRequest();
		const response = await fetchWithTimeout(saveApiUrl, {
			method: "GET",
			headers: {
				"User-Agent": USER_AGENT,
			},
			timeout: 60000,
		});

		// The save endpoint returns HTML, but includes a Location header
		// with the archived URL when successful
		const location = response.headers.get("Location");
		const contentLocation = response.headers.get("Content-Location");
		const archivedPath = location ?? contentLocation;

		if (archivedPath?.includes("/web/")) {
			const match = /\/web\/(\d{14})\//.exec(archivedPath);
			const result: SaveResult = {
				success: true,
				message: `Successfully submitted ${validatedUrl} for archiving`,
				archivedUrl: `https://web.archive.org${archivedPath}`,
			};
			if (match?.[1] !== undefined) {
				result.timestamp = match[1];
			}
			return result;
		}

		// Try the save API endpoint (alternative method)
		waybackRateLimiter.recordRequest();
		const response2 = await fetchWithTimeout(
			"https://web.archive.org/save",
			{
				method: "POST",
				headers: {
					"User-Agent": USER_AGENT,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: `url=${encodeURIComponent(validatedUrl)}`,
				timeout: 60000,
			},
		);

		try {
			const text = await response2.text();
			const data = SaveResponseSchema.parse(JSON.parse(text));
			const result: SaveResult = {
				success: true,
				message: `Successfully submitted ${validatedUrl} for archiving`,
				jobId: data.job_id,
				archivedUrl: data.url,
			};
			if (data.timestamp !== undefined) {
				result.timestamp = data.timestamp;
			}
			return result;
		} catch {
			return {
				success: true,
				message: `Successfully submitted ${validatedUrl} for archiving. Check status in a few moments.`,
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
