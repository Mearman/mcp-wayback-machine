/**
 * Cloudflare Cache API backend.
 *
 * Uses the global `caches` API available in Workers at no extra cost.
 * Unlike KV (1k writes/day on free tier), the Cache API has no published
 * daily limits — it's designed for HTTP response caching at the edge.
 *
 * Stored Responses carry a Cache-Control max-age header derived from the
 * remaining TTL, so the cache evicts stale entries automatically. A custom
 * content-type header distinguishes our serialised entries from arbitrary
 * cached responses.
 */

import * as z from "zod";
import { CachedResponse as CachedResponseSchema } from "./cache.ts";
import type { CacheBackend } from "./cache.ts";

type CachedResponse = z.infer<typeof CachedResponseSchema>;

const CACHE_NAME = "mcp-wayback-machine";

/**
 * Content-type tag for serialised cache entries.
 * Used to distinguish our entries from any other cached responses.
 */
const CACHE_ENTRY_TYPE = "application/x-mcp-wb-cache+json";

export class CacheApiBackend implements CacheBackend {
    private cache?: Cache;

    private async getCache(): Promise<Cache> {
        this.cache ??= await caches.open(CACHE_NAME);
        return this.cache;
    }

    async get(key: string): Promise<CachedResponse | undefined> {
        try {
            const cache = await this.getCache();
            const request = new Request(cacheUrl(key));
            const response = await cache.match(request);
            if (response === undefined) {
                return undefined;
            }

            const contentType = response.headers.get("content-type");
            if (contentType !== CACHE_ENTRY_TYPE) {
                return undefined;
            }

            const parsed: unknown = await response.json();
            return CachedResponseSchema.parse(parsed);
        } catch {
            return undefined;
        }
    }

    async set(key: string, entry: CachedResponse): Promise<void> {
        const ttlMs = entry.expiry - Date.now();
        if (ttlMs <= 0) {
            return;
        }

        const maxAge = Math.ceil(ttlMs / 1000);
        const request = new Request(cacheUrl(key));
        const response = new Response(JSON.stringify(entry), {
            headers: {
                "content-type": CACHE_ENTRY_TYPE,
                "cache-control": `public, max-age=${String(maxAge)}`,
            },
        });

        try {
            const cache = await this.getCache();
            await cache.put(request, response);
        } catch {
            // Cache API write failure is non-fatal
        }
    }

    async delete(key: string): Promise<void> {
        const cache = await this.getCache();
        const request = new Request(cacheUrl(key));
        await cache.delete(request);
    }

    async clear(): Promise<void> {
        // The Cache API doesn't have a bulk clear.
        // Entries expire via Cache-Control max-age, so stale entries
        // are evicted automatically. This is a no-op.
    }
}

/**
 * Generate a cacheable URL from a cache key.
 * The Cache API keys on Request URLs, so we need a valid URL.
 * The origin doesn't matter — it just needs to be unique per key.
 */
function cacheUrl(key: string): string {
    return `https://cache.local/${key}`;
}
