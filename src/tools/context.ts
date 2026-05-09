/**
 * Shared context passed to all tool functions.
 * Provides dependency injection for fetch and schema-validated JSON fetching.
 */

import type * as z from "zod";

export interface ToolContext {
    /**
     * Fetch a URL. Throws HttpError on non-ok responses.
     * In production, wired to caching + rate limiting + credentials.
     * In tests, a simple fake.
     */
    fetch: (url: string, options?: FetchOptions) => Promise<Response>;

    /**
     * Fetch a URL and parse the JSON response through a Zod schema.
     * Absorbs fetch + response.text() + JSON.parse + schema.parse into one call.
     */
    fetchJSON: <T>(url: string, schema: z.ZodType<T>) => Promise<T>;
}

export interface FetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
}
