/**
 * Save URL tool - Archives a URL to the Wayback Machine
 */

import { z } from 'zod';
import { HttpError, fetchWithTimeout } from '../utils/http.js';
import { waybackRateLimiter } from '../utils/rate-limit.js';
import { validateUrl } from '../utils/validation.js';

export const SaveUrlSchema = z.object({
	url: z.string().url().describe('The URL to save to the Wayback Machine'),
});

export type SaveUrlInput = z.infer<typeof SaveUrlSchema>;

interface SaveResponse {
	url: string;
	job_id: string;
	timestamp?: string;
}

/**
 * Save a URL to the Wayback Machine
 */
export async function saveUrl(input: SaveUrlInput): Promise<{
	success: boolean;
	message: string;
	jobId?: string;
	archivedUrl?: string;
	timestamp?: string;
}> {
	const { url } = input;

	try {
		// Validate URL
		const validatedUrl = validateUrl(url);

		// Check rate limit
		await waybackRateLimiter.waitForSlot();

		// Make the save request
		const saveApiUrl = `https://web.archive.org/save/${encodeURIComponent(validatedUrl)}`;

		waybackRateLimiter.recordRequest();
		const response = await fetchWithTimeout(saveApiUrl, {
			method: 'GET',
			headers: {
				'User-Agent': 'mcp-wayback-machine/0.1.0',
			},
			timeout: 60000, // 60 seconds for save operations
		});

		// The save endpoint returns HTML, but includes a Location header
		// with the archived URL when successful
		const location = response.headers.get('Location');
		const contentLocation = response.headers.get('Content-Location');
		const archivedUrl = location || contentLocation;

		if (archivedUrl?.includes('/web/')) {
			// Extract timestamp from the archived URL
			const match = archivedUrl.match(/\/web\/(\d{14})\//);
			const timestamp = match ? match[1] : undefined;

			return {
				success: true,
				message: `Successfully submitted ${validatedUrl} for archiving`,
				archivedUrl: `https://web.archive.org${archivedUrl}`,
				timestamp,
			};
		}

		// Try the save API endpoint (alternative method)
		const saveApiUrl2 = 'https://web.archive.org/save';
		waybackRateLimiter.recordRequest();
		const response2 = await fetchWithTimeout(saveApiUrl2, {
			method: 'POST',
			headers: {
				'User-Agent': 'mcp-wayback-machine/0.1.0',
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: `url=${encodeURIComponent(validatedUrl)}`,
			timeout: 60000,
		});

		// Try to parse as JSON
		try {
			const data = (await response2.json()) as SaveResponse;
			return {
				success: true,
				message: `Successfully submitted ${validatedUrl} for archiving`,
				jobId: data.job_id,
				archivedUrl: data.url,
				timestamp: data.timestamp,
			};
		} catch {
			// If not JSON, assume success if we got a 200
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
					message: 'Rate limit exceeded. Please try again later.',
				};
			}
			return {
				success: false,
				message: `Failed to save URL: ${error.message}`,
			};
		}

		return {
			success: false,
			message: `Failed to save URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}
