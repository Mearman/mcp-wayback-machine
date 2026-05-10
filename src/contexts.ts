/**
 * Production ToolContext — wires up caching, rate limiting, credentials,
 * and Retry-After handling. Single unified context for all tools.
 */

import type { ToolContext } from "./tools/context.ts";
import { cachingFetcher } from "./utils/cache.ts";
import { HttpError } from "./utils/http.ts";
import { waybackRateLimiter } from "./utils/rate-limit.ts";

import pkg from "../package.json" with { type: "json" };

const USER_AGENT = `mcp-wayback-machine/${pkg.version}`;

/**
 * Internet Archive S3 credentials for higher SPN2 rate limits
 */
interface Credentials {
    readonly accessKey: string;
    readonly secretKey: string;
}

function readCredentials(): Credentials | undefined {
    const accessKey = process.env.WAYBACK_ACCESS_KEY;
    const secretKey = process.env.WAYBACK_SECRET_KEY;
    if (accessKey !== undefined && secretKey !== undefined) {
        return { accessKey, secretKey };
    }
    return undefined;
}

const credentials = readCredentials();

/**
 * Build headers for a request, injecting User-Agent and credentials
 * when applicable.
 */
function buildHeaders(
    url: string,
    overrides?: Record<string, string>
): Record<string, string> {
    const headers: Record<string, string> = {
        "User-Agent": USER_AGENT,
        ...overrides,
    };

    // Inject S3 auth on save endpoints for higher SPN2 rate limits
    if (credentials !== undefined && url.includes("web.archive.org/save")) {
        headers.Authorization = `LOW ${credentials.accessKey}:${credentials.secretKey}`;
    }

    return headers;
}

/**
 * Handle Retry-After from 429 responses.
 * Throws immediately if the response is a 429, pausing for the
 * retry interval before retrying (up to 3 attempts).
 */
async function fetchWithRetryAfter(
    url: string,
    options: Record<string, unknown> & {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
    },
    attempt = 1
): Promise<Response> {
    try {
        return await cachingFetcher.fetch(url, options);
    } catch (error) {
        if (
            error instanceof HttpError &&
            (error.status === 429 || error.status === 498) &&
            attempt < 3
        ) {
            const retryHeader = error.response;
            // Parse Retry-After from the response or default to 5s
            const retryAfter = parseRetryAfter(retryHeader) ?? 5000;
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
            return fetchWithRetryAfter(url, options, attempt + 1);
        }
        throw error;
    }
}

/**
 * Parse Retry-After value from response body or headers.
 * Accepts seconds or HTTP-date format.
 */
function parseRetryAfter(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;

    // Try parsing as seconds
    const seconds = Number(value);
    if (!Number.isNaN(seconds) && seconds > 0) {
        return seconds * 1000;
    }

    // Try parsing as HTTP date
    const date = Date.parse(value);
    if (!Number.isNaN(date)) {
        return Math.max(0, date - Date.now());
    }

    return undefined;
}

/**

 * Unified production context — all tools share caching, rate limiting, and credentials

 */
export const context: ToolContext = {
    async fetch(url, options) {
        await waybackRateLimiter.waitForSlot();
        waybackRateLimiter.recordRequest();

        const headers = buildHeaders(url, options?.headers);

        return fetchWithRetryAfter(url, {
            ...options,
            headers,
        });
    },

    async fetchJSON(url, schema) {
        const response = await this.fetch(url);
        const text = await response.text();
        const parsed: unknown = JSON.parse(text);
        return schema.parse(parsed);
    },
};
