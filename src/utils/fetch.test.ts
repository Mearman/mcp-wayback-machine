/**
 * @fileoverview Tests for the configurable fetch utility
 * @module utils/fetch.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	ConfigurableFetch,
	FetchBackend,
	configurableFetch,
	createFetch,
	fetchJson,
	fetchText,
} from './fetch.js';

// Mock node-fetch-cache
vi.mock('node-fetch-cache', () => {
	const MockNodeFetchCache = vi.fn().mockImplementation(() => ({
		fetch: vi.fn(),
		clear: vi.fn(),
	}));
	return { default: MockNodeFetchCache };
});

// Mock global fetch
global.fetch = vi.fn();

describe('ConfigurableFetch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('constructor and configuration', () => {
		it('should create instance with default configuration', () => {
			const fetch = new ConfigurableFetch();
			const config = fetch.getConfig();

			expect(config.backend).toBe(FetchBackend.BUILT_IN);
			expect(config.cacheTtl).toBe(5 * 60 * 1000); // 5 minutes
			expect(config.cacheDir).toBe('.cache');
			expect(config.maxCacheSize).toBe(100 * 1024 * 1024); // 100MB
			expect(config.defaultHeaders).toEqual({});
		});

		it('should create instance with custom configuration', () => {
			const customConfig = {
				backend: FetchBackend.CACHE_MEMORY,
				cacheTtl: 10000,
				userAgent: 'test-agent',
				defaultHeaders: { 'X-Test': 'header' },
			};

			const fetch = new ConfigurableFetch(customConfig);
			const config = fetch.getConfig();

			expect(config.backend).toBe(FetchBackend.CACHE_MEMORY);
			expect(config.cacheTtl).toBe(10000);
			expect(config.userAgent).toBe('test-agent');
			expect(config.defaultHeaders).toEqual({ 'X-Test': 'header' });
		});

		it('should validate configuration with schema', () => {
			expect(() => {
				new ConfigurableFetch({
					backend: 'invalid-backend' as FetchBackend,
				});
			}).toThrow();
		});
	});

	describe('updateConfig', () => {
		it('should update configuration', () => {
			const fetch = new ConfigurableFetch();

			fetch.updateConfig({
				backend: FetchBackend.CACHE_DISK,
				userAgent: 'updated-agent',
			});

			const config = fetch.getConfig();
			expect(config.backend).toBe(FetchBackend.CACHE_DISK);
			expect(config.userAgent).toBe('updated-agent');
		});
	});

	describe('fetch with built-in backend', () => {
		it('should use built-in fetch', async () => {
			const mockResponse = new Response('test', { status: 200 });
			vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

			const fetch = new ConfigurableFetch({ backend: FetchBackend.BUILT_IN });
			const result = await fetch.fetch('https://example.com');

			expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
				headers: {},
			});
			expect(result).toBeDefined();
		});

		it('should merge headers correctly', async () => {
			const mockResponse = new Response('test', { status: 200 });
			vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

			const fetch = new ConfigurableFetch({
				backend: FetchBackend.BUILT_IN,
				userAgent: 'test-agent',
				defaultHeaders: { 'X-Default': 'value' },
			});

			await fetch.fetch('https://example.com', {
				headers: { 'X-Custom': 'custom' },
			});

			expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
				headers: {
					'X-Default': 'value',
					'User-Agent': 'test-agent',
					'X-Custom': 'custom',
				},
			});
		});

		it('should handle Headers object', async () => {
			const mockResponse = new Response('test', { status: 200 });
			vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

			const fetch = new ConfigurableFetch({ backend: FetchBackend.BUILT_IN });
			const headers = new Headers();
			headers.set('X-Test', 'value');

			await fetch.fetch('https://example.com', { headers });

			expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
				headers: {
					'x-test': 'value', // Headers are normalized to lowercase
				},
			});
		});

		it('should handle array headers', async () => {
			const mockResponse = new Response('test', { status: 200 });
			vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

			const fetch = new ConfigurableFetch({ backend: FetchBackend.BUILT_IN });
			const headers: [string, string][] = [['X-Test', 'value']];

			await fetch.fetch('https://example.com', { headers });

			expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
				headers: {
					'X-Test': 'value', // Array headers maintain original case
				},
			});
		});
	});

	describe('fetch with per-request overrides', () => {
		it('should override backend per request', async () => {
			const mockResponse = new Response('test', { status: 200 });
			vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

			const fetch = new ConfigurableFetch({ backend: FetchBackend.CACHE_MEMORY });

			// Override to use built-in fetch
			await fetch.fetch('https://example.com', {
				backend: FetchBackend.BUILT_IN,
			});

			expect(global.fetch).toHaveBeenCalled();
		});

		it('should handle noCache option', async () => {
			const mockResponse = new Response('test', { status: 200 });
			vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

			const fetch = new ConfigurableFetch({ backend: FetchBackend.CACHE_MEMORY });

			// noCache should force built-in fetch even with cache backend
			await fetch.fetch('https://example.com', { noCache: true });

			expect(global.fetch).toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should handle fetch errors', async () => {
			vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

			const fetch = new ConfigurableFetch({ backend: FetchBackend.BUILT_IN });

			await expect(fetch.fetch('https://example.com')).rejects.toThrow(
				'Fetch failed (backend: built-in): Network error',
			);
		});

		it('should throw error for unsupported backend', async () => {
			const fetch = new ConfigurableFetch();

			await expect(
				fetch.fetch('https://example.com', {
					backend: 'unsupported' as FetchBackend,
				}),
			).rejects.toThrow('Unsupported fetch backend: unsupported');
		});
	});

	describe('cache operations', () => {
		it('should clear caches', async () => {
			const fetch = new ConfigurableFetch();

			// Should not throw
			await expect(fetch.clearCaches()).resolves.toBeUndefined();
		});

		it('should get cache stats', () => {
			const fetch = new ConfigurableFetch();
			const stats = fetch.getCacheStats();

			expect(stats).toBeTypeOf('object');
			expect(stats.memory).toBeDefined();
			expect(stats.disk).toBeDefined();
		});
	});
});

describe('global configurableFetch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset global instance to default config
		configurableFetch.updateConfig({ backend: FetchBackend.BUILT_IN });
	});

	it('should be accessible globally', () => {
		expect(configurableFetch).toBeInstanceOf(ConfigurableFetch);
	});

	it('should work as drop-in fetch replacement', async () => {
		const mockResponse = new Response('test', { status: 200 });
		vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

		await configurableFetch.fetch('https://example.com');

		expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
			headers: {},
		});
	});
});

describe('createFetch', () => {
	it('should create new instance with configuration', () => {
		const fetch = createFetch({
			backend: FetchBackend.CACHE_DISK,
			userAgent: 'custom-agent',
		});

		const config = fetch.getConfig();
		expect(config.backend).toBe(FetchBackend.CACHE_DISK);
		expect(config.userAgent).toBe('custom-agent');
	});
});

describe('fetchJson', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		configurableFetch.updateConfig({ backend: FetchBackend.BUILT_IN });
	});

	it('should fetch and parse JSON', async () => {
		const mockData = { message: 'test' };
		const mockResponse = new Response(JSON.stringify(mockData), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
		vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

		const result = await fetchJson('https://api.example.com/data');

		expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data', {
			headers: {
				Accept: 'application/json',
			},
		});
		expect(result).toEqual(mockData);
	});

	it('should throw on HTTP error', async () => {
		const mockResponse = new Response('Not found', { status: 404 });
		vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

		await expect(fetchJson('https://api.example.com/data')).rejects.toThrow(
			'HTTP error! status: 404',
		);
	});
});

describe('fetchText', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		configurableFetch.updateConfig({ backend: FetchBackend.BUILT_IN });
	});

	it('should fetch and return text', async () => {
		const mockText = 'Hello, world!';
		const mockResponse = new Response(mockText, { status: 200 });
		vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

		const result = await fetchText('https://example.com');

		expect(result).toBe(mockText);
	});

	it('should throw on HTTP error', async () => {
		const mockResponse = new Response('Not found', { status: 404 });
		vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

		await expect(fetchText('https://example.com')).rejects.toThrow('HTTP error! status: 404');
	});
});

describe('FetchBackend enum', () => {
	it('should have expected values', () => {
		expect(FetchBackend.BUILT_IN).toBe('built-in');
		expect(FetchBackend.CACHE_MEMORY).toBe('cache-memory');
		expect(FetchBackend.CACHE_DISK).toBe('cache-disk');
	});
});
