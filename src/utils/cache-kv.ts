/**
 * Cloudflare KV cache backend.
 *
 * Uses Workers KV as a persistent cache with TTL support.
 * KV natively expires entries via the `expirationTtl` put option,
 * so expired reads return `null` automatically. An in-memory Map
 * provides sub-request deduplication within a single Worker invocation.
 */

import type { CacheBackend } from "./cache.ts";

/**
 * Shape stored in KV. Matches the CachedResponse schema from cache.ts
 * but defined here to avoid importing the Zod schema at Worker edge.
 */
interface KvEntry {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    expiry: number;
}

/**
 * Cloudflare KV namespace binding. Only the operations used by the
 * CacheBackend interface are declared — no need for the full KV type.
 */
interface KVNamespace {
    get(key: string, options?: { type?: "text" }): Promise<string | null>;
    put(
        key: string,
        value: string,
        options?: { expirationTtl?: number }
    ): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<{ keys: Array<{ name: string }> }>;
}

export class KvCacheBackend implements CacheBackend {
    private readonly kv: KVNamespace;

    constructor(kv: KVNamespace) {
        this.kv = kv;
    }

    async get(key: string): Promise<KvEntry | undefined> {
        const raw = await this.kv.get(key, { type: "text" });
        if (raw === null) {
            return undefined;
        }
        try {
            return JSON.parse(raw) as KvEntry;
        } catch {
            return undefined;
        }
    }

    async set(key: string, entry: KvEntry): Promise<void> {
        const ttlMs = entry.expiry - Date.now();
        // KV minimum expirationTtl is 60s; for shorter windows, just don't set TTL.
        const expirationTtl =
            ttlMs > 60_000 ? Math.ceil(ttlMs / 1000) : undefined;
        await this.kv.put(
            key,
            JSON.stringify(entry),
            expirationTtl !== undefined ? { expirationTtl } : undefined
        );
    }

    async delete(key: string): Promise<void> {
        await this.kv.delete(key);
    }

    async clear(): Promise<void> {
        const listed = await this.kv.list();
        await Promise.all(
            listed.keys.map((k) => this.kv.delete(k.name))
        );
    }
}
