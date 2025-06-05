/**
 * Check Archive Status tool - Check if a URL has been archived
 */

import { z } from 'zod';
import { HttpError, fetchWithTimeout, parseJsonResponse } from '../utils/http.js';
import { waybackRateLimiter } from '../utils/rate-limit.js';
import { validateUrl } from '../utils/validation.js';

export const CheckArchiveStatusSchema = z.object({
	url: z.string().url().describe('The URL to check'),
});

export type CheckArchiveStatusInput = z.infer<typeof CheckArchiveStatusSchema>;

interface SparklineResponse {
	first_ts?: string;
	last_ts?: string;
	years?: Record<string, number[]>;
	captures?: number;
}

/**
 * Check if a URL has been archived and get statistics
 */
export async function checkArchiveStatus(input: CheckArchiveStatusInput): Promise<{
	success: boolean;
	message: string;
	isArchived: boolean;
	firstCapture?: string;
	lastCapture?: string;
	totalCaptures?: number;
	yearlyCaptures?: Record<string, number>;
}> {
	const { url } = input;

	try {
		// Validate URL
		const validatedUrl = validateUrl(url);

		// Check rate limit
		await waybackRateLimiter.waitForSlot();

		// Use the Sparkline API for statistics
		const apiUrl = new URL('https://web.archive.org/__wb/sparkline');
		apiUrl.searchParams.set('url', validatedUrl);
		apiUrl.searchParams.set('collection', 'web');
		apiUrl.searchParams.set('output', 'json');

		waybackRateLimiter.recordRequest();
		const response = await fetchWithTimeout(apiUrl.toString(), {
			headers: {
				'User-Agent': 'mcp-wayback-machine/0.1.0',
			},
		});

		const data = await parseJsonResponse<SparklineResponse>(response);

		if (data.first_ts) {
			// Calculate yearly totals
			const yearlyCaptures: Record<string, number> = {};
			if (data.years) {
				for (const [year, months] of Object.entries(data.years)) {
					yearlyCaptures[year] = months.reduce((sum, count) => sum + count, 0);
				}
			}

			// Format timestamps
			const formatDate = (ts: string) => {
				if (ts.length >= 8) {
					const year = ts.substring(0, 4);
					const month = ts.substring(4, 6);
					const day = ts.substring(6, 8);
					return `${year}-${month}-${day}`;
				}
				return ts;
			};

			return {
				success: true,
				message: `${validatedUrl} has been archived ${data.captures || 0} times`,
				isArchived: true,
				firstCapture: formatDate(data.first_ts),
				lastCapture: data.last_ts ? formatDate(data.last_ts) : undefined,
				totalCaptures: data.captures || 0,
				yearlyCaptures,
			};
		}

		// Also check using availability API as fallback
		const availUrl = new URL('https://archive.org/wayback/available');
		availUrl.searchParams.set('url', validatedUrl);

		waybackRateLimiter.recordRequest();
		const availResponse = await fetchWithTimeout(availUrl.toString(), {
			headers: {
				'User-Agent': 'mcp-wayback-machine/0.1.0',
			},
		});

		const availData = await parseJsonResponse<any>(availResponse);

		if (availData.archived_snapshots?.closest?.available) {
			return {
				success: true,
				message: `${validatedUrl} has been archived`,
				isArchived: true,
				lastCapture: availData.archived_snapshots.closest.timestamp,
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
			message: `Failed to check archive status: ${error instanceof Error ? error.message : 'Unknown error'}`,
			isArchived: false,
		};
	}
}
