/**
 * Test helpers for creating fake ToolContext instances.
 */

import { HttpError } from "../src/utils/http.ts";
import type { ToolContext } from "../src/tools/context.ts";

/**
 * Create a fake fetch function that returns canned responses based on URL patterns.
 * Throws HttpError on non-ok responses (matching production fetchWithTimeout behaviour).
 */
export function fakeFetch(
    responses: {
        url: string;
        status?: number;
        body?: string;
        headers?: Record<string, string>;
    }[]
): ToolContext["fetch"] {
    return (url: string) => {
        const match = responses.find((r) => url.includes(r.url));
        if (match === undefined) {
            return Promise.reject(new Error("connection refused"));
        }

        const status = match.status ?? 200;
        const response = new Response(match.body ?? "", {
            status,
            ...(match.headers ? { headers: match.headers } : {}),
        });

        if (!response.ok) {
            return Promise.reject(
                new HttpError(
                    `HTTP ${String(status)}`,
                    status,
                    match.body ?? ""
                )
            );
        }

        return Promise.resolve(response);
    };
}

/**
 * Create a fake fetch that rejects all requests with a network error.
 */
export function rejectingFetch(
    message = "connection refused"
): ToolContext["fetch"] {
    return () => {
        throw new Error(message);
    };
}

/**
 * Create a test context with a fake fetch and fetchJSON derived from it.
 */
export function testContext(fetch: ToolContext["fetch"]): ToolContext {
    return {
        fetch,
        async fetchJSON<T>(
            url: string,
            schema: { parse: (v: unknown) => T }
        ): Promise<T> {
            const response = await fetch(url);
            const text = await response.text();
            const parsed: unknown = JSON.parse(text);
            return schema.parse(parsed);
        },
    };
}
