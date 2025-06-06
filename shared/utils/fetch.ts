/**
 * Configurable fetch utility with caching, rate limiting, and retry logic
 * This is shared across all MCP servers for consistent HTTP handling
 */

import NodeFetchCache, { MemoryCache } from 'node-fetch-cache';

export interface FetchConfig {
	/** Cache TTL in milliseconds (default: 5 minutes) */
	cacheTTL?: number;
	/** Enable/disable caching (default: true) */
	enableCache?: boolean;
	/** Request timeout in milliseconds (default: 30 seconds) */
	timeout?: number;
	/** Number of retry attempts (default: 3) */
	retries?: number;
	/** Base delay for exponential backoff in ms (default: 1000) */
	retryDelay?: number;
	/** Custom headers to include with all requests */
	defaultHeaders?: Record<string, string>;
	/** Rate limiting: max requests per minute (default: 60) */
	rateLimit?: number;
}

export class ConfigurableFetch {
	private fetch: typeof fetch;
	private config: Required<FetchConfig>;
	private requestTimes: number[] = [];

	constructor(config: FetchConfig = {}) {
		this.config = {
			cacheTTL: config.cacheTTL ?? 5 * 60 * 1000, // 5 minutes
			enableCache: config.enableCache ?? true,
			timeout: config.timeout ?? 30 * 1000, // 30 seconds
			retries: config.retries ?? 3,
			retryDelay: config.retryDelay ?? 1000,
			defaultHeaders: config.defaultHeaders ?? {},
			rateLimit: config.rateLimit ?? 60, // 60 requests per minute
		};

		// Initialize fetch with or without cache
		if (this.config.enableCache) {
			this.fetch = NodeFetchCache.create({
				cache: new MemoryCache({ ttl: this.config.cacheTTL }),
			});
		} else {
			this.fetch = fetch;
		}
	}

	/**
	 * Make a fetch request with built-in retry, timeout, and rate limiting
	 */
	async request(url: string, options: RequestInit = {}): Promise<Response> {
		await this.checkRateLimit();

		const requestOptions: RequestInit = {
			...options,
			headers: {
				...this.config.defaultHeaders,
				...options.headers,
			},
			signal: this.createTimeoutSignal(),
		};

		return this.executeWithRetry(url, requestOptions);
	}

	/**
	 * Convenience method for GET requests
	 */
	async get(url: string, options: RequestInit = {}): Promise<Response> {
		return this.request(url, { ...options, method: 'GET' });
	}

	/**
	 * Convenience method for POST requests
	 */
	async post(url: string, data?: unknown, options: RequestInit = {}): Promise<Response> {
		const requestOptions: RequestInit = {
			...options,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
		};

		if (data) {
			requestOptions.body = JSON.stringify(data);
		}

		return this.request(url, requestOptions);
	}

	/**
	 * Fetch and parse JSON response
	 */
	async json<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
		const response = await this.get(url, options);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Create a timeout signal for the request
	 */
	private createTimeoutSignal(): AbortSignal {
		const controller = new AbortController();
		setTimeout(() => controller.abort(), this.config.timeout);
		return controller.signal;
	}

	/**
	 * Execute request with exponential backoff retry
	 */
	private async executeWithRetry(url: string, options: RequestInit): Promise<Response> {
		let lastError: Error;

		for (let attempt = 0; attempt <= this.config.retries; attempt++) {
			try {
				const response = await this.fetch(url, options);

				// Don't retry on client errors (4xx), only server errors (5xx) and network issues
				if (response.ok || (response.status >= 400 && response.status < 500)) {
					return response;
				}

				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			} catch (error) {
				lastError = error as Error;

				// Don't retry on last attempt
				if (attempt === this.config.retries) {
					break;
				}

				// Calculate exponential backoff delay
				const delay = this.config.retryDelay * 2 ** attempt;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw new Error(
			`Request failed after ${this.config.retries + 1} attempts: ${lastError.message}`,
		);
	}

	/**
	 * Check and enforce rate limiting
	 */
	private async checkRateLimit(): Promise<void> {
		const now = Date.now();
		const oneMinuteAgo = now - 60 * 1000;

		// Remove old requests
		this.requestTimes = this.requestTimes.filter((time) => time > oneMinuteAgo);

		// Check if we're at the rate limit
		if (this.requestTimes.length >= this.config.rateLimit) {
			const oldestRequest = this.requestTimes[0];
			const waitTime = oldestRequest + 60 * 1000 - now;

			if (waitTime > 0) {
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}
		}

		// Record this request
		this.requestTimes.push(now);
	}

	/**
	 * Clear the cache (if caching is enabled)
	 */
	clearCache(): void {
		if (this.config.enableCache && this.fetch.cache) {
			this.fetch.cache.clear();
		}
	}

	/**
	 * Get cache statistics (if caching is enabled)
	 */
	getCacheStats(): { size: number; hits: number; misses: number } | null {
		if (this.config.enableCache && this.fetch.cache) {
			return {
				size: this.fetch.cache.size || 0,
				hits: this.fetch.cache.hits || 0,
				misses: this.fetch.cache.misses || 0,
			};
		}
		return null;
	}
}

/**
 * Create a configured fetch instance with sensible defaults for MCP servers
 */
export function createMCPFetch(config: FetchConfig = {}): ConfigurableFetch {
	return new ConfigurableFetch({
		cacheTTL: 5 * 60 * 1000, // 5 minutes
		enableCache: true,
		timeout: 30 * 1000, // 30 seconds
		retries: 3,
		retryDelay: 1000,
		rateLimit: 60, // 60 requests per minute
		defaultHeaders: {
			'User-Agent': 'MCP-Server/1.0',
		},
		...config,
	});
}

/**
 * Default fetch instance for MCP servers
 */
export const mcpFetch = createMCPFetch();
