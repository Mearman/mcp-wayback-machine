import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { HttpError, fetchWithTimeout } from "../../src/utils/http.js";

const originalFetch = globalThis.fetch;

function mockFetch(response: Response): typeof fetch {
	const fn = () => Promise.resolve(response);
	globalThis.fetch = fn;
	return fn;
}

function mockFetchError(error: Error): void {
	globalThis.fetch = () => Promise.reject(error);
}

function restoreFetch(): void {
	globalThis.fetch = originalFetch;
}

describe("HttpError", () => {
	afterEach(restoreFetch);

	it("constructs with message only", () => {
		const error = new HttpError("something went wrong");
		assert.equal(error.message, "something went wrong");
		assert.equal(error.name, "HttpError");
		assert.equal(error.status, undefined);
		assert.equal(error.response, undefined);
		assert.ok(error instanceof Error);
	});

	it("constructs with status and response", () => {
		const error = new HttpError("bad request", 400, "body text");
		assert.equal(error.message, "bad request");
		assert.equal(error.status, 400);
		assert.equal(error.response, "body text");
	});
});

describe("fetchWithTimeout", () => {
	afterEach(restoreFetch);

	it("returns response on success", async () => {
		const body = JSON.stringify({ ok: true });
		mockFetch(new Response(body, { status: 200, statusText: "OK" }));

		const response = await fetchWithTimeout("https://example.com/api");
		assert.equal(response.status, 200);
		assert.equal(await response.text(), body);
	});

	it("passes options through to fetch", async () => {
		let capturedInit: RequestInit | undefined;
		globalThis.fetch = (_url: unknown, init?: RequestInit) => {
			capturedInit = init;
			return Promise.resolve(new Response("ok"));
		};

		await fetchWithTimeout("https://example.com/api", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: '{"data":1}',
		});

		assert.equal(capturedInit?.method, "POST");
		assert.deepEqual(capturedInit.headers, {
			"Content-Type": "application/json",
		});
		assert.equal(capturedInit.body, '{"data":1}');
	});

	it("throws HttpError on non-ok response", async () => {
		mockFetch(
			new Response("not found", { status: 404, statusText: "Not Found" }),
		);

		await assert.rejects(
			() => fetchWithTimeout("https://example.com/api"),
			(error: unknown) => {
				assert.ok(error instanceof HttpError);
				assert.equal(error.status, 404);
				assert.equal(error.response, "not found");
				assert.match(error.message, /404/);
				return true;
			},
		);
	});

	it("throws HttpError on timeout", async () => {
		globalThis.fetch = (_url: unknown, init?: RequestInit) =>
			new Promise((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => {
					const error = new DOMException(
						"The operation was aborted",
						"AbortError",
					);
					reject(error);
				});
			});

		await assert.rejects(
			() => fetchWithTimeout("https://example.com/api", { timeout: 10 }),
			(error: unknown) => {
				assert.ok(error instanceof HttpError);
				assert.match(error.message, /timeout/);
				return true;
			},
		);
	});

	it("re-throws non-abort errors", async () => {
		const networkError = new TypeError("Failed to fetch");
		mockFetchError(networkError);

		await assert.rejects(
			() => fetchWithTimeout("https://example.com/api"),
			(error: unknown) => {
				assert.ok(error instanceof TypeError);
				assert.equal(error.message, "Failed to fetch");
				return true;
			},
		);
	});
});
