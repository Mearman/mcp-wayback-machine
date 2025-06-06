import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as httpModule from '../utils/http.js';
import * as rateLimitModule from '../utils/rate-limit.js';
import { checkArchiveStatus } from './status.js';

vi.mock('../utils/http.js', async () => {
	const actual = await vi.importActual<typeof import('../utils/http.js')>('../utils/http.js');
	return {
		...actual,
		fetchWithTimeout: vi.fn(),
		parseJsonResponse: vi.fn(),
	};
});
vi.mock('../utils/rate-limit.js');

describe('checkArchiveStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(rateLimitModule.waybackRateLimiter, 'waitForSlot').mockResolvedValue(undefined);
		vi.spyOn(rateLimitModule.waybackRateLimiter, 'recordRequest').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should check archive status successfully', async () => {
		const mockResponse = new Response(
			JSON.stringify({
				first_ts: '20100101120000',
				last_ts: '20231225120000',
				years: {
					'2023': [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
					'2022': [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
				},
				captures: 500,
			}),
		);

		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);
		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce({
			first_ts: '20100101120000',
			last_ts: '20231225120000',
			years: {
				'2023': [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
				'2022': [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
			},
			captures: 500,
		});

		const result = await checkArchiveStatus({ url: 'https://example.com' });

		expect(result.success).toBe(true);
		expect(result.isArchived).toBe(true);
		expect(result.firstCapture).toBe('2010-01-01');
		expect(result.lastCapture).toBe('2023-12-25');
		expect(result.totalCaptures).toBe(500);
		expect(result.yearlyCaptures).toEqual({
			'2023': 780,
			'2022': 390,
		});
	});

	it('should handle no archives found', async () => {
		const mockResponse = new Response(JSON.stringify({}));

		vi.spyOn(httpModule, 'fetchWithTimeout')
			.mockResolvedValueOnce(mockResponse)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						archived_snapshots: {},
					}),
				),
			);

		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce({}).mockResolvedValueOnce({
			archived_snapshots: {},
		});

		const result = await checkArchiveStatus({ url: 'https://example.com' });

		expect(result.success).toBe(true);
		expect(result.isArchived).toBe(false);
		expect(result.totalCaptures).toBe(0);
		expect(result.message).toContain('has not been archived');
	});

	it('should fallback to availability API', async () => {
		const mockResponse1 = new Response(JSON.stringify({}));
		const mockResponse2 = new Response(
			JSON.stringify({
				archived_snapshots: {
					closest: {
						available: true,
						timestamp: '20231225120000',
					},
				},
			}),
		);

		vi.spyOn(httpModule, 'fetchWithTimeout')
			.mockResolvedValueOnce(mockResponse1)
			.mockResolvedValueOnce(mockResponse2);

		vi.spyOn(httpModule, 'parseJsonResponse')
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({
				archived_snapshots: {
					closest: {
						available: true,
						timestamp: '20231225120000',
					},
				},
			});

		const result = await checkArchiveStatus({ url: 'https://example.com' });

		expect(result.success).toBe(true);
		expect(result.isArchived).toBe(true);
		expect(result.lastCapture).toBe('20231225120000');
	});

	it('should handle 404 errors', async () => {
		vi.spyOn(httpModule, 'fetchWithTimeout').mockRejectedValueOnce(
			new httpModule.HttpError('Not found', 404),
		);

		const result = await checkArchiveStatus({ url: 'https://example.com' });

		expect(result.success).toBe(true);
		expect(result.isArchived).toBe(false);
		expect(result.totalCaptures).toBe(0);
		expect(result.message).toContain('has not been archived');
	});

	it('should handle other HTTP errors', async () => {
		vi.spyOn(httpModule, 'fetchWithTimeout').mockRejectedValueOnce(
			new httpModule.HttpError('Server error', 500),
		);

		const result = await checkArchiveStatus({ url: 'https://example.com' });

		expect(result.success).toBe(false);
		expect(result.isArchived).toBe(false);
		expect(result.message).toContain('Failed to check archive status');
	});

	it('should handle invalid URLs', async () => {
		const result = await checkArchiveStatus({ url: 'not-a-url' });

		expect(result.success).toBe(false);
		expect(result.isArchived).toBe(false);
		expect(result.message).toContain('Failed to check archive status');
	});

	it('should handle short timestamps', async () => {
		const mockResponse = new Response(
			JSON.stringify({
				first_ts: '2010',
				last_ts: '2023',
				captures: 10,
			}),
		);

		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);
		vi.spyOn(httpModule, 'parseJsonResponse').mockResolvedValueOnce({
			first_ts: '2010',
			last_ts: '2023',
			captures: 10,
		});

		const result = await checkArchiveStatus({ url: 'https://example.com' });

		expect(result.firstCapture).toBe('2010');
		expect(result.lastCapture).toBe('2023');
	});
});
