/**
 * HTTP request caching with in-memory and pluggable persistent backends.
 * Stores serialised responses (status, headers, body) with TTL-based expiry.
 * Supports per-endpoint TTL via URL pattern matching.
 *
 * The default disk cache lives under the user's cache directory (XDG_CACHE_HOME
 * or ~/.cache on Linux/macOS, %LOCALAPPDATA% on Windows) with 0700 / 0600
 * permissions so it cannot be poisoned by other users on a shared host.
 *
 * Alternative backends (e.g. Cloudflare KV) implement the CacheBackend interface
 * and are passed via the CachingFetcher constructor.
 */

import { join } from "node:path";
import { homedir } from "node:os";
import * as z from "zod";
import { fetchWithTimeout } from "./http.ts";

export const CachedResponse = z.object({
    status: z.number(),
    statusText: z.string().trim(),
    headers: z.record(z.string(), z.string().trim()),
    body: z.string().trim(),
    expiry: z.number(),
});

type CachedResponse = z.infer<typeof CachedResponse>;

/**

 * TTL durations in milliseconds

 */
export const TTL = {
    /**
     * Archived snapshot content — immutable once captured
     */
    SNAPSHOT: 24 * 60 * 60 * 1000,
    /**
     * Availability API — snapshots don't change often
     */
    AVAILABILITY: 60 * 60 * 1000,
    /**
     * CDX search — snapshot list grows but never mutates
     */
    CDX_SEARCH: 60 * 60 * 1000,
    /**
     * Sparkline capture statistics — grows, never mutates
     */
    SPARKLINE: 60 * 60 * 1000,
    /**
     * Save (POST) — idempotent per URL
     */
    SAVE: 30 * 60 * 1000,
    /**
     * Save status polling — changes during active jobs
     */
    SAVE_STATUS: 30 * 1000,
} as const;

/**
 * Persistent cache backend — read/write cached HTTP responses.
 * Implemented by disk (Node.js), KV (Cloudflare Workers), etc.
 */
export interface CacheBackend {
    get(key: string): Promise<CachedResponse | undefined>;
    set(key: string, entry: CachedResponse): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

interface CacheConfig {
    /**
     * Default TTL in milliseconds
     */
    ttl: number;
    /**
     * Persistent cache backend. Defaults to disk cache if not provided.
     */
    backend: CacheBackend;
}

/**
 * Default cache directory — per-user, not a shared world-readable tmp path.
 * Honours $XDG_CACHE_HOME on Linux when set; falls back to ~/.cache otherwise.
 * On Windows, %LOCALAPPDATA% is preferred when present.
 */
function defaultCacheDir(): string {
    const xdg = process.env.XDG_CACHE_HOME;
    if (xdg !== undefined && xdg !== "") {
        return join(xdg, "mcp-wayback-machine");
    }
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData !== undefined && localAppData !== "") {
        return join(localAppData, "mcp-wayback-machine", "cache");
    }
    return join(homedir(), ".cache", "mcp-wayback-machine");
}

/**
 * Disk-backed cache backend using the filesystem.
 * Uses restrictive permissions (0700 dir, 0600 files) to prevent cache poisoning.
 */
export class DiskCacheBackend implements CacheBackend {
    private readonly dir: string;

    constructor(dir: string) {
        this.dir = dir;
    }

    async get(key: string): Promise<CachedResponse | undefined> {
        try {
            const { readFile } = await import("node:fs/promises");
            const { join } = await import("node:path");
            const filePath = join(this.dir, `${key}.json`);
            const data = await readFile(filePath, "utf-8");
            const parsed: unknown = JSON.parse(data);
            return CachedResponse.parse(parsed);
        } catch {
            return undefined;
        }
    }

    async set(key: string, entry: CachedResponse): Promise<void> {
        try {
            const { mkdir, writeFile } = await import("node:fs/promises");
            const { join } = await import("node:path");
            await mkdir(this.dir, { recursive: true, mode: 0o700 });
            const filePath = join(this.dir, `${key}.json`);
            await writeFile(filePath, JSON.stringify(entry), {
                encoding: "utf-8",
                mode: 0o600,
            });
        } catch {
            // Disk cache write failure is non-fatal
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const { unlink } = await import("node:fs/promises");
            const { join } = await import("node:path");
            await unlink(join(this.dir, `${key}.json`));
        } catch {
            // File may not exist
        }
    }

    async clear(): Promise<void> {
        try {
            const { readdir, unlink } = await import("node:fs/promises");
            const { join } = await import("node:path");
            const files = await readdir(this.dir);
            await Promise.all(
                files.map((file) =>
                    unlink(join(this.dir, file)).catch(() => undefined)
                )
            );
        } catch {
            // Directory may not exist
        }
    }
}

const DEFAULT_CONFIG: CacheConfig = {
    ttl: TTL.AVAILABILITY,
    backend: new DiskCacheBackend(defaultCacheDir()),
};

/**
 * Match a URL to the appropriate TTL based on endpoint patterns.
 * Returns undefined for URLs that should not be cached.
 */
function resolveTtl(url: string): number | false | undefined {
    // Snapshot content — any URL replay with /web/{timestamp}.../{original}
    if (/\/web\/\d{4,14}(id_|im_|js_|cs_)?\//.test(url)) {
        return TTL.SNAPSHOT;
    }

    // Screenshot access — /screenshot/{url}
    if (url.includes("web.archive.org/screenshot/")) {
        return TTL.SNAPSHOT;
    }

    // Availability API
    if (url.includes("archive.org/wayback/available")) {
        return TTL.AVAILABILITY;
    }

    // CDX search API
    if (url.includes("web.archive.org/cdx/search/cdx")) {
        return TTL.CDX_SEARCH;
    }

    // Sparkline API
    if (url.includes("web.archive.org/__wb/sparkline")) {
        return TTL.SPARKLINE;
    }

    // Save endpoint (GET or POST)
    if (url.includes("web.archive.org/save")) {
        // Save status polling uses different URL pattern
        if (url.includes("/save/status/")) {
            return TTL.SAVE_STATUS;
        }
        return TTL.SAVE;
    }

    // Unknown endpoint — use default TTL
    return undefined;
}

async function hashKey(url: string): Promise<string> {
    const data = new TextEncoder().encode(url);
    const buffer = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
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
     * The persistent backend in use (disk, KV, etc.).
     */
    get backend(): CacheBackend {
        return this.config.backend;
    }

    /**
     * Fetch with caching. Returns cached response if fresh,
     * otherwise fetches from network and populates both caches.
     *
     * TTL is resolved automatically from the URL pattern.
     * Pass cacheTtl to override, or false to bypass cache entirely.
     */
    async fetch(
        url: string,
        options: {
            method?: string;
            headers?: Record<string, string>;
            body?: string;
            timeout?: number;
        } = {},
        cacheTtl?: number | false
    ): Promise<Response> {
        // Only cache GET requests
        if (options.method !== undefined && options.method !== "GET") {
            return fetchWithTimeout(url, options);
        }

        if (cacheTtl === false) {
            return fetchWithTimeout(url, options);
        }

        const key = await hashKey(url);
        const resolvedTtl = resolveTtl(url);
        const ttl = cacheTtl ?? resolvedTtl ?? this.config.ttl;

        // Check memory cache
        const memoryHit = this.memoryCache.get(key);
        if (memoryHit !== undefined && memoryHit.expiry > Date.now()) {
            return toResponse(memoryHit);
        }

        // Check persistent backend
        const backendHit = await this.config.backend.get(key);
        if (backendHit !== undefined && backendHit.expiry > Date.now()) {
            this.memoryCache.set(key, backendHit);
            return toResponse(backendHit);
        }

        // Cache miss — fetch from network
        const response = await fetchWithTimeout(url, options);
        const body = await response.text();
        const entry: CachedResponse = {
            status: response.status,
            statusText: response.statusText,
            headers: serialiseHeaders(response),
            body,
            expiry:
                Date.now() + (typeof ttl === "number" ? ttl : this.config.ttl),
        };

        this.memoryCache.set(key, entry);
        await this.config.backend.set(key, entry);

        return toResponse(entry);
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();
        await this.config.backend.clear();
    }

    getStats(): { memoryEntries: number } {
        return { memoryEntries: this.memoryCache.size };
    }

    async prune(): Promise<void> {
        const now = Date.now();
        for (const [key, entry] of this.memoryCache) {
            if (entry.expiry <= now) {
                this.memoryCache.delete(key);
            }
        }
    }


}

/**
 * Disk-backed cache backend using the filesystem.
 * Uses restrictive permissions (0700 dir, 0600 files) to prevent cache poisoning.
 */
/**
 * Shared instance for use across tools in stdio mode.
 */
export const cachingFetcher = new CachingFetcher();
