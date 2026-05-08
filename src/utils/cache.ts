/**
 * HTTP request caching with both in-memory and disk backends.
 * Stores serialised responses (status, headers, body) with TTL-based expiry.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";
import { fetchWithTimeout } from "./http.js";

const CachedResponse = z.object({
	status: z.number(),
	statusText: z.string(),
	headers: z.record(z.string(), z.string()),
	body: z.string(),
	expiry: z.number(),
});

type CachedResponse = z.infer<typeof CachedResponse>;

interface CacheConfig {
	/** Default TTL in milliseconds (default: 5 minutes) */
	ttl: number;
	/** Directory for disk cache (default: .cache/mcp-wayback-machine) */
	diskDir: string;
}

const DEFAULT_CONFIG: CacheConfig = {
	ttl: 5 * 60 * 1000,
	diskDir: join(tmpdir(), "mcp-wayback-machine-cache"),
};

function hashKey(url: string): string {
	return createHash("sha256").update(url).digest("hex");
}

function serialiseHeaders(response: Response): Record<string, string> {
	const headers: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		headers[key] = value;
	});
	return headers;
}

function toResponse(cached: CachedResponse): Response {
	return new Response(cached.body, {
		status: cached.status,
		statusText: cached.statusText,
		headers: cached.headers,
	});
}

export class CachingFetcher {
	private readonly config: CacheConfig;
	private readonly memoryCache = new Map<string, CachedResponse>();

	constructor(config: Partial<CacheConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Fetch with caching. Returns cached response if fresh,
	 * otherwise fetches from network and populates both caches.
	 *
	 * @param url - URL to fetch
	 * @param options - Fetch options (passed through to fetchWithTimeout)
	 * @param cacheTtl - Override default TTL for this request, or false to bypass cache
	 */
	async fetch(
		url: string,
		options: {
			method?: string;
			headers?: Record<string, string>;
			body?: string;
			timeout?: number;
		} = {},
		cacheTtl?: number | false,
	): Promise<Response> {
		// Only cache GET requests
		if (options.method !== undefined && options.method !== "GET") {
			return fetchWithTimeout(url, options);
		}

		if (cacheTtl === false) {
			return fetchWithTimeout(url, options);
		}

		const key = hashKey(url);
		const ttl = cacheTtl ?? this.config.ttl;

		// Check memory cache
		const memoryHit = this.memoryCache.get(key);
		if (memoryHit !== undefined && memoryHit.expiry > Date.now()) {
			return toResponse(memoryHit);
		}

		// Check disk cache
		const diskHit = await this.readDisk(key);
		if (diskHit !== undefined && diskHit.expiry > Date.now()) {
			this.memoryCache.set(key, diskHit);
			return toResponse(diskHit);
		}

		// Cache miss — fetch from network
		const response = await fetchWithTimeout(url, options);
		const body = await response.text();
		const entry: CachedResponse = {
			status: response.status,
			statusText: response.statusText,
			headers: serialiseHeaders(response),
			body,
			expiry: Date.now() + ttl,
		};

		this.memoryCache.set(key, entry);
		await this.writeDisk(key, entry);

		return toResponse(entry);
	}

	/**
	 * Clear all caches
	 */
	async clear(): Promise<void> {
		this.memoryCache.clear();
		await this.clearDisk();
	}

	/**
	 * Remove expired entries from both caches
	 */
	async prune(): Promise<void> {
		const now = Date.now();
		for (const [key, entry] of this.memoryCache) {
			if (entry.expiry <= now) {
				this.memoryCache.delete(key);
			}
		}
		await this.pruneDisk();
	}

	private async readDisk(key: string): Promise<CachedResponse | undefined> {
		try {
			const filePath = join(this.config.diskDir, `${key}.json`);
			const data = await readFile(filePath, "utf-8");
			const parsed: unknown = JSON.parse(data);
			return CachedResponse.parse(parsed);
		} catch {
			return undefined;
		}
	}

	private async writeDisk(key: string, entry: CachedResponse): Promise<void> {
		try {
			await mkdir(this.config.diskDir, { recursive: true });
			const filePath = join(this.config.diskDir, `${key}.json`);
			await writeFile(filePath, JSON.stringify(entry), "utf-8");
		} catch {
			// Disk cache write failure is non-fatal
		}
	}

	private async clearDisk(): Promise<void> {
		try {
			const { readdir } = await import("node:fs/promises");
			const files = await readdir(this.config.diskDir);
			await Promise.all(
				files.map((file) =>
					unlink(join(this.config.diskDir, file)).catch(
						() => undefined,
					),
				),
			);
		} catch {
			// Directory may not exist
		}
	}

	private async pruneDisk(): Promise<void> {
		try {
			const { readdir } = await import("node:fs/promises");
			const now = Date.now();
			const files = await readdir(this.config.diskDir);
			await Promise.all(
				files.map(async (file) => {
					const entry = await this.readDisk(
						file.replace(".json", ""),
					);
					if (entry !== undefined && entry.expiry <= now) {
						await unlink(join(this.config.diskDir, file)).catch(
							() => undefined,
						);
					}
				}),
			);
		} catch {
			// Directory may not exist
		}
	}
}

/** Shared instance for use across all tools */
export const cachingFetcher = new CachingFetcher();
