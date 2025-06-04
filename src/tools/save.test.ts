import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveUrl } from './save.js';
import * as httpModule from '../utils/http.js';
import * as rateLimitModule from '../utils/rate-limit.js';

vi.mock('../utils/http.js');
vi.mock('../utils/rate-limit.js');

describe('saveUrl', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(rateLimitModule.waybackRateLimiter, 'waitForSlot').mockResolvedValue(undefined as any);
		vi.spyOn(rateLimitModule.waybackRateLimiter, 'recordRequest').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should successfully save a URL with location header', async () => {
		const mockResponse = new Response('', {
			headers: {
				Location: '/web/20231225120000/https://example.com',
			},
		});
		
		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);

		const result = await saveUrl({ url: 'https://example.com' });

		expect(result.success).toBe(true);
		expect(result.message).toContain('Successfully submitted');
		expect(result.archivedUrl).toBe('https://web.archive.org/web/20231225120000/https://example.com');
		expect(result.timestamp).toBe('20231225120000');
	});

	it('should handle rate limit errors', async () => {
		vi.spyOn(httpModule, 'fetchWithTimeout').mockRejectedValueOnce(
			new httpModule.HttpError('Rate limited', 429)
		);

		const result = await saveUrl({ url: 'https://example.com' });

		expect(result.success).toBe(false);
		expect(result.message).toContain('Rate limit exceeded');
	});

	it('should handle invalid URLs', async () => {
		const result = await saveUrl({ url: 'not-a-url' });

		expect(result.success).toBe(false);
		expect(result.message).toContain('Failed to save URL');
	});

	it('should try alternative save endpoint', async () => {
		const mockResponse1 = new Response('', { status: 200 });
		const mockResponse2 = new Response(JSON.stringify({
			job_id: '12345',
			url: 'https://web.archive.org/web/20231225120000/https://example.com',
			timestamp: '20231225120000'
		}));

		vi.spyOn(httpModule, 'fetchWithTimeout')
			.mockResolvedValueOnce(mockResponse1)
			.mockResolvedValueOnce(mockResponse2);

		const result = await saveUrl({ url: 'https://example.com' });

		expect(result.success).toBe(true);
		expect(result.jobId).toBe('12345');
		expect(httpModule.fetchWithTimeout).toHaveBeenCalledTimes(2);
	});

	it('should handle content-location header', async () => {
		const mockResponse = new Response('', {
			headers: {
				'Content-Location': '/web/20231225120000/https://example.com',
			},
		});
		
		vi.spyOn(httpModule, 'fetchWithTimeout').mockResolvedValueOnce(mockResponse);

		const result = await saveUrl({ url: 'https://example.com' });

		expect(result.success).toBe(true);
		expect(result.archivedUrl).toBe('https://web.archive.org/web/20231225120000/https://example.com');
	});

	it('should handle generic errors', async () => {
		vi.spyOn(httpModule, 'fetchWithTimeout').mockRejectedValueOnce(
			new Error('Network error')
		);

		const result = await saveUrl({ url: 'https://example.com' });

		expect(result.success).toBe(false);
		expect(result.message).toContain('Network error');
	});
});