/**
 * * HTTP utilities for making API calls to the Wayback Machine
 */
interface FetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
}

export class HttpError extends Error {
    readonly status?: number | undefined;
    readonly response?: string | undefined;

    constructor(message: string, status?: number, response?: string) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.response = response;
    }
}

/**

 * * Wrapper around fetch with timeout support and error handling

 */
export async function fetchWithTimeout(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            throw new HttpError(
                `HTTP ${String(response.status)}: ${response.statusText}`,
                response.status,
                text
            );
        }

        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
            throw new HttpError(`Request timeout after ${String(timeout)}ms`);
        }

        throw error;
    }
}
