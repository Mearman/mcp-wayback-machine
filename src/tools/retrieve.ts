/**
 * Get Archived URL tool - Retrieves archived versions of URLs
 */

import { z } from 'zod';
import { fetchWithTimeout, HttpError, parseJsonResponse } from '../utils/http.js';
import { validateUrl, formatTimestamp } from '../utils/validation.js';
import { waybackRateLimiter } from '../utils/rate-limit.js';

export const GetArchivedUrlSchema = z.object({
	url: z.string().url().describe('The URL to retrieve from the Wayback Machine'),
	timestamp: z
		.string()
		.optional()
		.describe('Specific timestamp (YYYYMMDDhhmmss) or "latest" for most recent'),
});

export type GetArchivedUrlInput = z.infer<typeof GetArchivedUrlSchema>;

interface AvailabilityResponse {
	url: string;
	archived_snapshots: {
		closest?: {
			status: string;
			available: boolean;
			url: string;
			timestamp: string;
		};
	};
}

/**
 * Get an archived version of a URL
 */
export async function getArchivedUrl(input: GetArchivedUrlInput): Promise<{
	success: boolean;
	message: string;
	archivedUrl?: string;
	timestamp?: string;
	available?: boolean;
}> {
	const { url, timestamp } = input;

	try {
		// Validate inputs
		const validatedUrl = validateUrl(url);
		const formattedTimestamp = formatTimestamp(timestamp);

		// Check rate limit
		await waybackRateLimiter.waitForSlot();

		// Use the Wayback Availability API
		const apiUrl = new URL('https://archive.org/wayback/available');
		apiUrl.searchParams.set('url', validatedUrl);
		if (formattedTimestamp) {
			apiUrl.searchParams.set('timestamp', formattedTimestamp);
		}

		waybackRateLimiter.recordRequest();
		const response = await fetchWithTimeout(apiUrl.toString(), {
			headers: {
				'User-Agent': 'mcp-wayback-machine/0.1.0',
			},
		});

		const data = await parseJsonResponse<AvailabilityResponse>(response);

		if (data.archived_snapshots?.closest?.available) {
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
		if (formattedTimestamp) {
			const directUrl = `https://web.archive.org/web/${formattedTimestamp}/${validatedUrl}`;
			return {
				success: true,
				message: `No confirmed archive found. You can try this URL directly:`,
				archivedUrl: directUrl,
				timestamp: formattedTimestamp,
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
			message: `Failed to retrieve archived URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}