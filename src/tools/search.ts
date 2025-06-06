/**
 * Search Archives tool - Search the Wayback Machine for archived versions
 */

import { z } from 'zod';
import { HttpError, fetchWithTimeout, parseJsonResponse } from '../utils/http.js';
import { waybackRateLimiter } from '../utils/rate-limit.js';
import { validateUrl } from '../utils/validation.js';

export const SearchArchivesSchema = z.object({
	url: z.string().url().describe('The URL pattern to search for'),
	from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
	to: z.string().optional().describe('End date (YYYY-MM-DD)'),
	limit: z.number().optional().default(10).describe('Maximum number of results'),
});

export type SearchArchivesInput = z.infer<typeof SearchArchivesSchema>;

interface CDXResult {
	urlkey: string;
	timestamp: string;
	original: string;
	mimetype: string;
	statuscode: string;
	digest: string;
	length: string;
}

/**
 * Search the Wayback Machine archives
 */
export async function searchArchives(input: SearchArchivesInput): Promise<{
	success: boolean;
	message: string;
	results?: Array<{
		url: string;
		archivedUrl: string;
		timestamp: string;
		date: string;
		statusCode: string;
		mimeType: string;
	}>;
	totalResults?: number;
}> {
	const { url, from, to, limit = 10 } = input;

	try {
		// Validate inputs
		const validatedUrl = validateUrl(url);

		// Format dates if provided
		const fromDate = from ? from.replace(/-/g, '') : undefined;
		const toDate = to ? to.replace(/-/g, '') : undefined;

		// Validate date format
		if (fromDate && !/^\d{8}$/.test(fromDate)) {
			throw new Error('From date must be in YYYY-MM-DD format');
		}
		if (toDate && !/^\d{8}$/.test(toDate)) {
			throw new Error('To date must be in YYYY-MM-DD format');
		}

		// Check rate limit
		await waybackRateLimiter.waitForSlot();

		// Use the CDX API for searching
		const apiUrl = new URL('https://web.archive.org/cdx/search/cdx');
		apiUrl.searchParams.set('url', validatedUrl);
		apiUrl.searchParams.set('output', 'json');
		apiUrl.searchParams.set('limit', limit.toString());

		if (fromDate) {
			apiUrl.searchParams.set('from', fromDate);
		}
		if (toDate) {
			apiUrl.searchParams.set('to', toDate);
		}

		waybackRateLimiter.recordRequest();
		const response = await fetchWithTimeout(apiUrl.toString(), {
			headers: {
				'User-Agent': 'mcp-wayback-machine/0.1.0',
			},
		});

		const data = await parseJsonResponse<string[][]>(response);

		// First row is headers
		if (data.length <= 1) {
			return {
				success: true,
				message: `No archived versions found for ${validatedUrl}`,
				results: [],
				totalResults: 0,
			};
		}

		// Skip header row and map results
		const results = data.slice(1).map((row) => {
			const [urlkey, timestamp, original, mimetype, statuscode] = row;

			// Format timestamp as readable date
			const year = timestamp.substring(0, 4);
			const month = timestamp.substring(4, 6);
			const day = timestamp.substring(6, 8);
			const hour = timestamp.substring(8, 10) || '00';
			const minute = timestamp.substring(10, 12) || '00';
			const second = timestamp.substring(12, 14) || '00';

			const date = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
			const archivedUrl = `https://web.archive.org/web/${timestamp}/${original}`;

			return {
				url: original,
				archivedUrl,
				timestamp,
				date,
				statusCode: statuscode,
				mimeType: mimetype,
			};
		});

		return {
			success: true,
			message: `Found ${results.length} archived version(s) of ${validatedUrl}`,
			results,
			totalResults: results.length,
		};
	} catch (error) {
		if (error instanceof HttpError) {
			if (error.status === 404) {
				return {
					success: true,
					message: `No archived versions found for ${url}`,
					results: [],
					totalResults: 0,
				};
			}
			return {
				success: false,
				message: `Failed to search archives: ${error.message}`,
			};
		}

		return {
			success: false,
			message: `Failed to search archives: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}
