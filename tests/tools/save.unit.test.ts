import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { saveUrl } from "../../src/tools/save.js";
import { cachingFetcher } from "../../src/utils/cache.js";

const originalFetch = globalThis.fetch;

function jsonResponse(
	body: string,
	status = 200,
	headers: Record<string, string> = {},
): Response {
	return new Response(body, {
		status,
		statusText: status === 200 ? "OK" : "Error",
		headers,
	});
}

beforeEach(async () => {
	await cachingFetcher.clear();
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("saveUrl", () => {
	it("saves via Location header", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse("", 200, {
					Location: "/web/20240101120000/https://example.com/",
				}),
			);

		const result = await saveUrl({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(
			result.archivedUrl,
			"https://web.archive.org/web/20240101120000/https://example.com/",
		);
		assert.equal(result.timestamp, "20240101120000");
	});

	it("saves via Content-Location header", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse("", 200, {
					"Content-Location":
						"/web/20240202080000/https://example.com/",
				}),
			);

		const result = await saveUrl({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.timestamp, "20240202080000");
	});

	it("falls back to POST API when no Location header", async () => {
		let callCount = 0;
		globalThis.fetch = () => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve(jsonResponse("no location", 200));
			}
			return Promise.resolve(
				jsonResponse(
					JSON.stringify({
						url: "https://web.archive.org/web/123/https://example.com",
						job_id: "job-abc",
						timestamp: "20240303150000",
					}),
				),
			);
		};

		const result = await saveUrl({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.jobId, "job-abc");
		assert.equal(result.timestamp, "20240303150000");
	});

	it("handles POST API returning non-JSON", async () => {
		let callCount = 0;
		globalThis.fetch = () => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve(jsonResponse("no location", 200));
			}
			return Promise.resolve(jsonResponse("not json"));
		};

		const result = await saveUrl({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.match(result.message, /Check status/);
	});

	it("handles rate limit (429)", async () => {
		globalThis.fetch = () =>
			Promise.resolve(jsonResponse("rate limited", 429));

		const result = await saveUrl({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.match(result.message, /Rate limit/);
	});

	it("handles HTTP errors", async () => {
		globalThis.fetch = () =>
			Promise.resolve(jsonResponse("server error", 500));

		const result = await saveUrl({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.match(result.message, /Failed to save/);
	});

	it("handles network errors", async () => {
		globalThis.fetch = () => Promise.reject(new Error("network failure"));

		const result = await saveUrl({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.match(result.message, /network failure/);
	});

	it("rejects invalid URLs", async () => {
		const result = await saveUrl({ url: "not-a-url" });

		assert.equal(result.success, false);
	});
});
