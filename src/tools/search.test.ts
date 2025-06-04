import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchArchives } from './search.js';
import * as httpModule from '../utils/http.js';
import * as rateLimitModule from '../utils/rate-limit.js';

vi.mock('../utils/http.js', async () => {
	const actual = await vi.importActual<typeof import('../utils/http.js')>('../utils/http.js');
	return {
		...actual,
		fetchWithTimeout: vi.fn(),
		parseJsonResponse: vi.fn(),
	};
});
vi.mock('../utils/rate-limit.js');

describe('searchArchives', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(rateLimitModule.waybackRateLimiter, 'waitForSlot').mockResolvedValue(undefined as any);
		vi.spyOn(rateLimitModule.waybackRateLimiter, 'recordRequest').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should search archives successfully', async () => {
		const mockResponse = new Response(JSON.stringify([
			['urlkey', 'timestamp', 'original', 'mimetype', 'statuscode', 'digest', 'length'],
			['com,example)/', '20231225120000', 'https://example.com/', 'text/html', '200', 'ABC123', '1234']
		]));

		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);
		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce([
			['urlkey', 'timestamp', 'original', 'mimetype', 'statuscode', 'digest', 'length'],
			['com,example)/', '20231225120000', 'https://example.com/', 'text/html', '200', 'ABC123', '1234']
		]);

		const result = await searchArchives({ url: 'https://example.com', limit: 10 });

		expect(result.success).toBe(true);
		expect(result.results).toHaveLength(1);
		expect(result.results![0]).toEqual({
			url: 'https://example.com/',
			archivedUrl: 'https://web.archive.org/web/20231225120000/https://example.com/',
			timestamp: '20231225120000',
			date: '2023-12-25 12:00:00',
			statusCode: '200',
			mimeType: 'text/html'
		});
		expect(result.totalResults).toBe(1);
	});

	it('should handle empty results', async () => {
		const mockResponse = new Response(JSON.stringify([
			['urlkey', 'timestamp', 'original', 'mimetype', 'statuscode', 'digest', 'length']
		]));

		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);
		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce([
			['urlkey', 'timestamp', 'original', 'mimetype', 'statuscode', 'digest', 'length']
		]);

		const result = await searchArchives({ url: 'https://example.com', limit: 10 });

		expect(result.success).toBe(true);
		expect(result.results).toEqual([]);
		expect(result.totalResults).toBe(0);
		expect(result.message).toContain('No archived versions found');
	});

	it('should handle date filters', async () => {
		const mockResponse = new Response(JSON.stringify([['headers']]));

		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);
		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce([['headers']]);

		await searchArchives({ 
			url: 'https://example.com',
			from: '2023-01-01',
			to: '2023-12-31',
			limit: 5
		});

		expect(httpModule.fetchWithTimeout).toHaveBeenCalledWith(
			expect.stringContaining('from=20230101'),
			expect.any(Object)
		);
		expect(httpModule.fetchWithTimeout).toHaveBeenCalledWith(
			expect.stringContaining('to=20231231'),
			expect.any(Object)
		);
		expect(httpModule.fetchWithTimeout).toHaveBeenCalledWith(
			expect.stringContaining('limit=5'),
			expect.any(Object)
		);
	});

	it('should handle invalid date formats', async () => {
		const result = await searchArchives({ 
			url: 'https://example.com',
			from: 'invalid-date',
			limit: 10
		});

		expect(result.success).toBe(false);
		expect(result.message).toContain('From date must be in YYYY-MM-DD format');
	});

	it('should handle 404 errors', async () => {
		vi.spyOn(httpModule, 'fetchWithTimeout').mockRejectedValueOnce(
			new httpModule.HttpError('Not found', 404)
		);

		const result = await searchArchives({ url: 'https://example.com', limit: 10 });

		expect(result.success).toBe(true);
		expect(result.results).toEqual([]);
		expect(result.totalResults).toBe(0);
	});

	it('should handle other HTTP errors', async () => {
		vi.spyOn(httpModule, 'fetchWithTimeout').mockRejectedValueOnce(
			new httpModule.HttpError('Server error', 500)
		);

		const result = await searchArchives({ url: 'https://example.com', limit: 10 });

		expect(result.success).toBe(false);
		expect(result.message).toContain('Failed to search archives');
	});

	it('should handle invalid URLs', async () => {
		const result = await searchArchives({ url: 'not-a-url', limit: 10 });

		expect(result.success).toBe(false);
		expect(result.message).toContain('Failed to search archives');
	});
});