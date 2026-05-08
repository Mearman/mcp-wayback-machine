import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getArchivedUrl } from "../../src/tools/retrieve.js";
import { cachingFetcher } from "../../src/utils/cache.js";

const originalFetch = globalThis.fetch;

function jsonResponse(body: string, status = 200): Response {
	return new Response(body, {
		status,
		statusText: status === 200 ? "OK" : "Error",
	});
}

beforeEach(async () => {
	await cachingFetcher.clear();
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("getArchivedUrl", () => {
	it("returns archived URL when available", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse(
					JSON.stringify({
						url: "https://example.com",
						archived_snapshots: {
							closest: {
								status: "200",
								available: true,
								url: "https://web.archive.org/web/20240101120000/https://example.com/",
								timestamp: "20240101120000",
							},
						},
					}),
				),
			);

		const result = await getArchivedUrl({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.available, true);
		assert.equal(result.timestamp, "20240101120000");
		assert.equal(
			result.archivedUrl,
			"https://web.archive.org/web/20240101120000/https://example.com/",
		);
	});

	it("returns not found when no snapshots", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse(
					JSON.stringify({
						url: "https://example.com",
						archived_snapshots: {},
					}),
				),
			);

		const result = await getArchivedUrl({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.equal(result.available, false);
	});

	it("constructs direct URL for specific timestamp", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse(
					JSON.stringify({
						url: "https://example.com",
						archived_snapshots: {},
					}),
				),
			);

		const result = await getArchivedUrl({
			url: "https://example.com",
			timestamp: "20240101120000",
		});

		assert.equal(result.success, true);
		assert.equal(result.available, false);
		assert.equal(
			result.archivedUrl,
			"https://web.archive.org/web/20240101120000/https://example.com/",
		);
	});

	it("handles 'latest' timestamp without direct construction", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse(
					JSON.stringify({
						url: "https://example.com",
						archived_snapshots: {},
					}),
				),
			);

		const result = await getArchivedUrl({
			url: "https://example.com",
			timestamp: "latest",
		});

		assert.equal(result.success, false);
		assert.equal(result.archivedUrl, undefined);
	});

	it("handles HTTP errors", async () => {
		globalThis.fetch = () => Promise.resolve(jsonResponse("error", 500));

		const result = await getArchivedUrl({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.match(result.message, /Failed to retrieve/);
	});

	it("handles network errors", async () => {
		globalThis.fetch = () =>
			Promise.reject(new Error("connection refused"));

		const result = await getArchivedUrl({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.match(result.message, /connection refused/);
	});

	it("rejects invalid URLs", async () => {
		const result = await getArchivedUrl({ url: "not-a-url" });

		assert.equal(result.success, false);
	});
});
