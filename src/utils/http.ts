/**
 * HTTP utilities for making API calls to the Wayback Machine
 */

interface FetchOptions {
	method?: string;
	headers?: Record<string, string>;
	body?: string;
	timeout?: number;
}

export class HttpError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
		public readonly response?: string,
	) {
		super(message);
		this.name = 'HttpError';
	}
}

/**
 * Wrapper around fetch with timeout support and error handling
 */
export async function fetchWithTimeout(
	url: string,
	options: FetchOptions = {},
): Promise<Response> {
	const { timeout = 30000, ...fetchOptions } = options;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...fetchOptions,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			throw new HttpError(
				`HTTP ${response.status}: ${response.statusText}`,
				response.status,
				text,
			);
		}

		return response;
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof Error) {
			if (error.name === 'AbortError') {
				throw new HttpError(`Request timeout after ${timeout}ms`);
			}
			throw error;
		}

		throw new HttpError('Network error occurred');
	}
}

/**
 * Parse JSON response with error handling
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
	try {
		return await response.json() as T;
	} catch (error) {
		throw new HttpError('Failed to parse JSON response');
	}
}