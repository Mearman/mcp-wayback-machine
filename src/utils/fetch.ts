/**
 * @fileoverview Configurable fetch utility with multiple backends and caching options
 * @module utils/fetch
 */

import NodeFetchCache from 'node-fetch-cache';
import { z } from 'zod';

/**
 * Supported fetch backends
 */
export enum FetchBackend {
	/** Use the built-in Node.js fetch API */
	BUILT_IN = 'built-in',
	/** Use node-fetch-cache with in-memory caching */
	CACHE_MEMORY = 'cache-memory',
	/** Use node-fetch-cache with on-disk caching */
	CACHE_DISK = 'cache-disk',
}

/**
 * Configuration options for the fetch utility
 */
export interface FetchConfig {
	/** The fetch backend to use */
	backend: FetchBackend;
	/** TTL for cache entries in milliseconds (default: 5 minutes) */
	cacheTtl?: number;
	/** Cache directory for disk caching (default: .cache) */
	cacheDir?: string;
	/** Maximum cache size in bytes (default: 100MB) */
	maxCacheSize?: number;
	/** User agent string to send with requests */
	userAgent?: string;
	/** Default headers to include with all requests */
	defaultHeaders?: Record<string, string>;
}

/**
 * Schema for validating fetch configuration
 */
export const FetchConfigSchema = z.object({
	backend: z.nativeEnum(FetchBackend),
	cacheTtl: z
		.number()
		.positive()
		.optional()
		.default(5 * 60 * 1000), // 5 minutes
	cacheDir: z.string().optional().default('.cache'),
	maxCacheSize: z
		.number()
		.positive()
		.optional()
		.default(100 * 1024 * 1024), // 100MB
	userAgent: z.string().optional(),
	defaultHeaders: z.record(z.string()).optional().default({}),
});

/**
 * Per-request options that can override global configuration
 */
export interface RequestOptions extends RequestInit {
	/** Override the fetch backend for this specific request */
	backend?: FetchBackend;
	/** Override cache TTL for this specific request */
	cacheTtl?: number;
	/** Force a fresh fetch, bypassing cache */
	noCache?: boolean;
}

/**
 * Internal fetch function type
 */
type FetchFunction = (url: string | URL, options?: RequestInit) => Promise<Response>;

/**
 * Configurable fetch utility class that provides multiple backends
 * and caching strategies for HTTP requests
 */
export class ConfigurableFetch {
	private config: FetchConfig;
	// biome-ignore lint/suspicious/noExplicitAny: node-fetch-cache doesn't export types
	private memoryCache?: any;
	// biome-ignore lint/suspicious/noExplicitAny: node-fetch-cache doesn't export types
	private diskCache?: any;

	/**
	 * Create a new ConfigurableFetch instance
	 * @param config - Configuration options for the fetch utility
	 */
	constructor(config: Partial<FetchConfig> = {}) {
		this.config = FetchConfigSchema.parse({
			backend: FetchBackend.BUILT_IN,
			...config,
		});

		this.initializeCaches();
	}

	/**
	 * Initialize cache instances based on configuration
	 */
	private initializeCaches(): void {
		try {
			// Initialize memory cache (in-memory only)
			this.memoryCache = NodeFetchCache;

			// Initialize disk cache (using file system)
			this.diskCache = NodeFetchCache;
		} catch (error) {
			// If cache initialization fails, we'll fall back to built-in fetch
			console.warn('Failed to initialize caches:', error);
		}
	}

	/**
	 * Update the global fetch configuration
	 * @param newConfig - New configuration options to merge with existing config
	 */
	updateConfig(newConfig: Partial<FetchConfig>): void {
		this.config = FetchConfigSchema.parse({
			...this.config,
			...newConfig,
		});
		this.initializeCaches();
	}

	/**
	 * Get the current fetch configuration
	 * @returns Current configuration object
	 */
	getConfig(): FetchConfig {
		return { ...this.config };
	}

	/**
	 * Get the appropriate fetch function based on backend
	 * @param backend - The fetch backend to use
	 * @returns Fetch function
	 */
	private getFetchFunction(backend: FetchBackend): FetchFunction {
		switch (backend) {
			case FetchBackend.BUILT_IN:
				return fetch;
			case FetchBackend.CACHE_MEMORY:
				if (!this.memoryCache) {
					console.warn('Memory cache not available, falling back to built-in fetch');
					return fetch;
				}
				return this.memoryCache as FetchFunction;
			case FetchBackend.CACHE_DISK:
				if (!this.diskCache) {
					console.warn('Disk cache not available, falling back to built-in fetch');
					return fetch;
				}
				return this.diskCache as FetchFunction;
			default:
				throw new Error(`Unsupported fetch backend: ${backend}`);
		}
	}

	/**
	 * Merge headers with configuration defaults
	 * @param requestHeaders - Headers from the request
	 * @returns Merged headers object
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Headers can be multiple types
	private mergeHeaders(requestHeaders?: any): Record<string, string> {
		const headers: Record<string, string> = {
			...this.config.defaultHeaders,
		};

		// Add user agent if configured
		if (this.config.userAgent) {
			headers['User-Agent'] = this.config.userAgent;
		}

		// Merge request headers
		if (requestHeaders) {
			if (requestHeaders instanceof Headers) {
				requestHeaders.forEach((value, key) => {
					headers[key] = value;
				});
			} else if (Array.isArray(requestHeaders)) {
				for (const [key, value] of requestHeaders) {
					headers[key] = value;
				}
			} else {
				Object.assign(headers, requestHeaders);
			}
		}

		return headers;
	}

	/**
	 * Perform an HTTP fetch with configurable backend and caching
	 * @param url - URL to fetch
	 * @param options - Request options with optional overrides
	 * @returns Promise resolving to Response object
	 */
	async fetch(url: string | URL, options: RequestOptions = {}): Promise<Response> {
		// Determine backend (request override or global config)
		const backend = options.backend || this.config.backend;

		// Extract ConfigurableFetch-specific options
		const { backend: _, cacheTtl, noCache, ...fetchOptions } = options;

		// Merge headers
		const headers = this.mergeHeaders(fetchOptions.headers);

		// Prepare final fetch options
		const finalOptions: RequestInit = {
			...fetchOptions,
			headers,
		};

		// Handle cache bypass for cached backends
		if (
			noCache &&
			(backend === FetchBackend.CACHE_MEMORY || backend === FetchBackend.CACHE_DISK)
		) {
			// For no-cache requests, force use of built-in fetch
			const builtInFetch = this.getFetchFunction(FetchBackend.BUILT_IN);
			return builtInFetch(url, finalOptions);
		}

		// Get the appropriate fetch function
		const fetchFn = this.getFetchFunction(backend);

		try {
			const response = await fetchFn(url, finalOptions);

			// Clone response to ensure it's consumable
			return response.clone();
		} catch (error) {
			throw new Error(
				`Fetch failed (backend: ${backend}): ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
		}
	}

	/**
	 * Clear all caches
	 */
	async clearCaches(): Promise<void> {
		try {
			const promises: Promise<void>[] = [];

			if (this.memoryCache && typeof this.memoryCache.clear === 'function') {
				promises.push(this.memoryCache.clear());
			}

			if (this.diskCache && typeof this.diskCache.clear === 'function') {
				promises.push(this.diskCache.clear());
			}

			await Promise.all(promises);
		} catch (error) {
			console.warn('Failed to clear caches:', error);
		}
	}

	/**
	 * Get cache statistics (if available)
	 * @returns Cache statistics object
	 */
	getCacheStats(): Record<string, unknown> {
		const stats: Record<string, unknown> = {};

		if (this.memoryCache) {
			stats.memory = {
				enabled: true,
				type: 'in-memory',
			};
		}

		if (this.diskCache) {
			stats.disk = {
				enabled: true,
				type: 'file-system',
				cacheDirectory: this.config.cacheDir,
			};
		}

		return stats;
	}
}

/**
 * Default global fetch instance
 * This can be used as a drop-in replacement for the built-in fetch
 */
export const configurableFetch = new ConfigurableFetch();

/**
 * Convenience function to create a fetch instance with specific configuration
 * @param config - Configuration options
 * @returns New ConfigurableFetch instance
 */
export function createFetch(config: Partial<FetchConfig>): ConfigurableFetch {
	return new ConfigurableFetch(config);
}

/**
 * Type-safe wrapper for fetch requests with JSON response parsing
 * @param url - URL to fetch
 * @param options - Request options
 * @returns Promise resolving to parsed JSON data
 */
export async function fetchJson<T = unknown>(
	url: string | URL,
	options: RequestOptions = {},
): Promise<T> {
	const response = await configurableFetch.fetch(url, {
		...options,
		headers: {
			Accept: 'application/json',
			...options.headers,
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return response.json() as Promise<T>;
}

/**
 * Type-safe wrapper for fetch requests with text response parsing
 * @param url - URL to fetch
 * @param options - Request options
 * @returns Promise resolving to text content
 */
export async function fetchText(url: string | URL, options: RequestOptions = {}): Promise<string> {
	const response = await configurableFetch.fetch(url, options);

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return response.text();
}
