import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as httpModule from '../utils/http.js';
import * as rateLimitModule from '../utils/rate-limit.js';
import { getArchivedUrl } from './retrieve.js';

vi.mock('../utils/http.js', async () => {
	const actual = await vi.importActual<typeof import('../utils/http.js')>('../utils/http.js');
	return {
		...actual,
		fetchWithTimeout: vi.fn(),
		parseJsonResponse: vi.fn(),
	};
});
vi.mock('../utils/rate-limit.js');

describe('getArchivedUrl', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(rateLimitModule.waybackRateLimiter, 'waitForSlot').mockResolvedValue(
			undefined as any,
		);
		vi.spyOn(rateLimitModule.waybackRateLimiter, 'recordRequest').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should retrieve archived URL successfully', async () => {
		const mockResponse = new Response(
			JSON.stringify({
				url: 'https://example.com',
				archived_snapshots: {
					closest: {
						status: '200',
						available: true,
						url: 'https://web.archive.org/web/20231225120000/https://example.com',
						timestamp: '20231225120000',
					},
				},
			}),
		);

		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);
		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce({
			url: 'https://example.com',
			archived_snapshots: {
				closest: {
					status: '200',
					available: true,
					url: 'https://web.archive.org/web/20231225120000/https://example.com',
					timestamp: '20231225120000',
				},
			},
		});

		const result = await getArchivedUrl({ url: 'https://example.com' });

		expect(result.success).toBe(true);
		expect(result.available).toBe(true);
		expect(result.archivedUrl).toBe(
			'https://web.archive.org/web/20231225120000/https://example.com',
		);
		expect(result.timestamp).toBe('20231225120000');
	});

	it('should handle no snapshots found', async () => {
		const mockResponse = new Response(
			JSON.stringify({
				url: 'https://example.com',
				archived_snapshots: {},
			}),
		);

		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);
		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce({
			url: 'https://example.com',
			archived_snapshots: {},
		});

		const result = await getArchivedUrl({ url: 'https://example.com' });

		expect(result.success).toBe(false);
		expect(result.available).toBe(false);
		expect(result.message).toContain('No archived versions found');
	});

	it('should provide direct URL when timestamp is specified', async () => {
		const mockResponse = new Response(
			JSON.stringify({
				url: 'https://example.com',
				archived_snapshots: {},
			}),
		);

		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);
		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce({
			url: 'https://example.com',
			archived_snapshots: {},
		});

		const result = await getArchivedUrl({
			url: 'https://example.com',
			timestamp: '20231225120000',
		});

		expect(result.success).toBe(true);
		expect(result.available).toBe(false);
		expect(result.archivedUrl).toBe(
			'https://web.archive.org/web/20231225120000/https://example.com/',
		);
	});

	it('should handle HTTP errors', async () => {
		vi.spyOn(httpModule, 'fetchWithTimeout').mockRejectedValueOnce(
			new httpModule.HttpError('Not found', 404),
		);

		const result = await getArchivedUrl({ url: 'https://example.com' });

		expect(result.success).toBe(false);
		expect(result.message).toContain('Failed to retrieve archived URL');
	});

	it('should handle invalid URLs', async () => {
		const result = await getArchivedUrl({ url: 'not-a-url' });

		expect(result.success).toBe(false);
		expect(result.message).toContain('Failed to retrieve archived URL');
	});

	it('should handle latest timestamp', async () => {
		const mockResponse = new Response(
			JSON.stringify({
				url: 'https://example.com',
				archived_snapshots: {
					closest: {
						status: '200',
						available: true,
						url: 'https://web.archive.org/web/20231225120000/https://example.com',
						timestamp: '20231225120000',
					},
				},
			}),
		);

		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);
		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce({
			url: 'https://example.com',
			archived_snapshots: {
				closest: {
					status: '200',
					available: true,
					url: 'https://web.archive.org/web/20231225120000/https://example.com',
					timestamp: '20231225120000',
				},
			},
		});

		const result = await getArchivedUrl({
			url: 'https://example.com',
			timestamp: 'latest',
		});

		expect(result.success).toBe(true);
		expect(result.available).toBe(true);
	});
});
