import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configurableFetch } from './fetch.js';
import { HttpError, fetchWithTimeout, parseJsonResponse } from './http.js';

// Mock the configurableFetch instead of global fetch
vi.mock('./fetch.js', () => ({
	configurableFetch: {
		fetch: vi.fn(),
	},
}));

describe('fetchWithTimeout', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('should make a successful request', async () => {
		const mockResponse = new Response('Success', { status: 200 });
		vi.mocked(configurableFetch.fetch).mockResolvedValueOnce(mockResponse);

		const response = await fetchWithTimeout('https://example.com');
		expect(response).toBe(mockResponse);
		expect(configurableFetch.fetch).toHaveBeenCalledWith('https://example.com', {
			signal: expect.any(AbortSignal),
		});
	});

	it('should handle HTTP errors', async () => {
		const mockResponse = new Response('Not Found', {
			status: 404,
			statusText: 'Not Found',
		});
		vi.mocked(configurableFetch.fetch).mockResolvedValueOnce(mockResponse);

		await expect(fetchWithTimeout('https://example.com')).rejects.toThrow(HttpError);
	});

	it('should handle timeout', async () => {
		// Create an abort controller to simulate timeout
		const abortError = new Error('The operation was aborted');
		abortError.name = 'AbortError';

		vi.mocked(configurableFetch.fetch).mockRejectedValueOnce(abortError);

		await expect(fetchWithTimeout('https://example.com', { timeout: 100 })).rejects.toThrow(
			'Request timeout after 100ms',
		);
	});

	it('should handle network errors', async () => {
		vi.mocked(configurableFetch.fetch).mockRejectedValueOnce(new Error('Network error'));

		await expect(fetchWithTimeout('https://example.com')).rejects.toThrow('Network error');
	});
});

describe('parseJsonResponse', () => {
	it('should parse valid JSON response', async () => {
		const data = { test: 'value' };
		const response = new Response(JSON.stringify(data));

		const result = await parseJsonResponse(response);
		expect(result).toEqual(data);
	});

	it('should handle invalid JSON', async () => {
		const response = new Response('invalid json');

		await expect(parseJsonResponse(response)).rejects.toThrow('Failed to parse JSON response');
	});
});
