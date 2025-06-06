/**
 * @fileoverview Tests for the fetch example tools
 * @module tools/fetch-example.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchBackend, configurableFetch } from '../utils/fetch.js';
import {
	ConfigureFetchSchema,
	FetchExampleSchema,
	configureFetchTool,
	fetchExampleTool,
} from './fetch-example.js';

// Mock the fetch utility
vi.mock('../utils/fetch.js', () => ({
	FetchBackend: {
		BUILT_IN: 'built-in',
		CACHE_MEMORY: 'cache-memory',
		CACHE_DISK: 'cache-disk',
	},
	configurableFetch: {
		fetch: vi.fn(),
		getConfig: vi.fn(),
		updateConfig: vi.fn(),
		clearCaches: vi.fn(),
		getCacheStats: vi.fn(),
	},
}));

describe('FetchExampleSchema', () => {
	it('should validate valid fetch example parameters', () => {
		const validParams = {
			url: 'https://httpbin.org/json',
			backend: FetchBackend.CACHE_MEMORY,
			no_cache: false,
			user_agent: 'Test-Agent/1.0',
		};

		const result = FetchExampleSchema.parse(validParams);
		expect(result).toEqual(validParams);
	});

	it('should apply default values', () => {
		const minimalParams = { url: 'https://example.com' };
		const result = FetchExampleSchema.parse(minimalParams);

		expect(result.no_cache).toBe(false);
		expect(result.url).toBe('https://example.com');
	});

	it('should reject invalid URL', () => {
		expect(() =>
			FetchExampleSchema.parse({
				url: 'not-a-url',
			}),
		).toThrow();
	});

	it('should reject invalid backend', () => {
		expect(() =>
			FetchExampleSchema.parse({
				url: 'https://example.com',
				backend: 'invalid-backend',
			}),
		).toThrow();
	});
});

describe('ConfigureFetchSchema', () => {
	it('should validate valid configuration parameters', () => {
		const validParams = {
			backend: FetchBackend.CACHE_DISK,
			cache_ttl: 30000,
			cache_dir: '/tmp/cache',
			user_agent: 'Custom-Agent/1.0',
			clear_cache: true,
		};

		const result = ConfigureFetchSchema.parse(validParams);
		expect(result).toEqual(validParams);
	});

	it('should apply default values', () => {
		const result = ConfigureFetchSchema.parse({});
		expect(result.clear_cache).toBe(false);
	});

	it('should reject negative cache_ttl', () => {
		expect(() =>
			ConfigureFetchSchema.parse({
				cache_ttl: -1000,
			}),
		).toThrow();
	});
});

describe('fetchExampleTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock default config
		vi.mocked(configurableFetch.getConfig).mockReturnValue({
			backend: FetchBackend.BUILT_IN,
			cacheTtl: 300000,
			cacheDir: '.cache',
			maxCacheSize: 104857600,
			userAgent: undefined,
			defaultHeaders: {},
		});
	});

	it('should fetch and display JSON data successfully', async () => {
		const mockData = { message: 'Hello, World!' };
		const mockResponse = {
			status: 200,
			statusText: 'OK',
			headers: {
				get: vi.fn().mockReturnValue('application/json'),
			},
			text: vi.fn().mockResolvedValue(JSON.stringify(mockData)),
		};

		// biome-ignore lint/suspicious/noExplicitAny: Test mocks
		vi.mocked(configurableFetch.fetch).mockResolvedValue(mockResponse as any);

		const result = await fetchExampleTool({
			url: 'https://httpbin.org/json',
			backend: FetchBackend.CACHE_MEMORY,
		});

		expect(configurableFetch.fetch).toHaveBeenCalledWith('https://httpbin.org/json', {
			backend: FetchBackend.CACHE_MEMORY,
			noCache: false,
		});

		expect(result.content[0].text).toContain('Fetch Example Results');
		expect(result.content[0].text).toContain('https://httpbin.org/json');
		expect(result.content[0].text).toContain('cache-memory');
		expect(result.content[0].text).toContain('200 OK');
		expect(result.content[0].text).toContain(JSON.stringify(mockData, null, 2));
	});

	it('should handle text data', async () => {
		const mockText = 'Hello, World!';
		const mockResponse = {
			status: 200,
			statusText: 'OK',
			headers: {
				get: vi.fn().mockReturnValue('text/plain'),
			},
			text: vi.fn().mockResolvedValue(mockText),
		};

		vi.mocked(configurableFetch.fetch)
			// biome-ignore lint/suspicious/noExplicitAny: Test mocks
			.mockResolvedValueOnce(mockResponse as any)
			// biome-ignore lint/suspicious/noExplicitAny: Test mocks
			.mockResolvedValueOnce(mockResponse as any);

		const result = await fetchExampleTool({
			url: 'https://example.com',
		});

		expect(result.content[0].text).toContain('**Parsed As**: text');
		expect(result.content[0].text).toContain(mockText);
	});

	it('should handle custom headers', async () => {
		const mockResponse = {
			status: 200,
			statusText: 'OK',
			headers: {
				get: vi.fn().mockReturnValue('text/plain'),
			},
			text: vi.fn().mockResolvedValue('test'),
		};

		// biome-ignore lint/suspicious/noExplicitAny: Test mocks
		vi.mocked(configurableFetch.fetch).mockResolvedValue(mockResponse as any);

		await fetchExampleTool({
			url: 'https://example.com',
			user_agent: 'Custom-Agent/1.0',
			no_cache: true,
		});

		expect(configurableFetch.fetch).toHaveBeenCalledWith('https://example.com', {
			backend: undefined,
			noCache: true,
			headers: {
				'User-Agent': 'Custom-Agent/1.0',
			},
		});
	});

	it('should handle fetch errors', async () => {
		vi.mocked(configurableFetch.fetch).mockRejectedValue(new Error('Network error'));

		const result = await fetchExampleTool({
			url: 'https://example.com',
		});

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('Fetch Example Error');
		expect(result.content[0].text).toContain('Network error');
	});

	it('should handle validation errors', async () => {
		const result = await fetchExampleTool({
			url: 'invalid-url',
		});

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('Fetch Example Error');
	});
});

describe('configureFetchTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock config and stats
		vi.mocked(configurableFetch.getConfig).mockReturnValue({
			backend: FetchBackend.CACHE_MEMORY,
			cacheTtl: 60000,
			cacheDir: '.cache',
			maxCacheSize: 104857600,
			userAgent: 'Test-Agent/1.0',
			defaultHeaders: {},
		});

		vi.mocked(configurableFetch.getCacheStats).mockReturnValue({
			memory: { enabled: true },
			disk: { enabled: true },
		});
	});

	it('should update configuration successfully', async () => {
		const result = await configureFetchTool({
			backend: FetchBackend.CACHE_DISK,
			cache_ttl: 120000,
			user_agent: 'Updated-Agent/2.0',
		});

		expect(configurableFetch.updateConfig).toHaveBeenCalledWith({
			backend: FetchBackend.CACHE_DISK,
			cacheTtl: 120000,
			userAgent: 'Updated-Agent/2.0',
		});

		expect(result.content[0].text).toContain('Fetch Configuration Updated');
		expect(result.content[0].text).toContain('cache-memory');
		expect(result.content[0].text).toContain('Test-Agent/1.0');
	});

	it('should clear caches when requested', async () => {
		const result = await configureFetchTool({
			clear_cache: true,
		});

		expect(configurableFetch.clearCaches).toHaveBeenCalled();
		expect(result.content[0].text).toContain('Caches cleared');
	});

	it('should handle empty configuration', async () => {
		const result = await configureFetchTool({});

		// Should not call updateConfig with empty object
		expect(configurableFetch.updateConfig).not.toHaveBeenCalled();
		expect(result.content[0].text).toContain('Current Configuration');
	});

	it('should handle configuration errors', async () => {
		vi.mocked(configurableFetch.updateConfig).mockImplementation(() => {
			throw new Error('Configuration error');
		});

		const result = await configureFetchTool({
			backend: FetchBackend.CACHE_DISK,
		});

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('Configuration Error');
		expect(result.content[0].text).toContain('Configuration error');
	});

	it('should handle validation errors', async () => {
		const result = await configureFetchTool({
			cache_ttl: -1000, // Invalid negative value
		});

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('Configuration Error');
	});
});
