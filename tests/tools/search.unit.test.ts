import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { searchArchives } from "../../src/tools/search.js";
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

describe("searchArchives", () => {
	it("returns mapped results from CDX API", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse(
					JSON.stringify([
						[
							"urlkey",
							"timestamp",
							"original",
							"mimetype",
							"statuscode",
							"digest",
							"length",
						],
						[
							"com,example)/",
							"20240101120000",
							"https://example.com/",
							"text/html",
							"200",
							"abc",
							"1234",
						],
						[
							"com,example)/",
							"20240202080000",
							"https://example.com/",
							"text/html",
							"301",
							"def",
							"5678",
						],
					]),
				),
			);

		const result = await searchArchives({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.totalResults, 2);
		assert.equal(result.results[0].date, "2024-01-01 12:00:00");
		assert.equal(result.results[0].statusCode, "200");
		assert.equal(result.results[1].statusCode, "301");
	});

	it("returns empty results when only headers present", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse(
					JSON.stringify([
						[
							"urlkey",
							"timestamp",
							"original",
							"mimetype",
							"statuscode",
							"digest",
							"length",
						],
					]),
				),
			);

		const result = await searchArchives({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.totalResults, 0);
		assert.deepEqual(result.results, []);
	});

	it("handles 404 as no results", async () => {
		globalThis.fetch = () =>
			Promise.resolve(jsonResponse("not found", 404));

		const result = await searchArchives({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.totalResults, 0);
	});

	it("rejects invalid from date", async () => {
		const result = await searchArchives({
			url: "https://example.com",
			from: "not-a-date",
		});

		assert.equal(result.success, false);
		assert.match(result.message, /YYYY-MM-DD/);
	});

	it("rejects invalid to date", async () => {
		const result = await searchArchives({
			url: "https://example.com",
			to: "bad",
		});

		assert.equal(result.success, false);
		assert.match(result.message, /YYYY-MM-DD/);
	});

	it("handles HTTP errors", async () => {
		globalThis.fetch = () =>
			Promise.resolve(jsonResponse("server error", 500));

		const result = await searchArchives({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.match(result.message, /Failed to search/);
	});

	it("handles network errors", async () => {
		globalThis.fetch = () => Promise.reject(new Error("dns failure"));

		const result = await searchArchives({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.match(result.message, /dns failure/);
	});

	it("rejects invalid URLs", async () => {
		const result = await searchArchives({ url: "not-a-url" });

		assert.equal(result.success, false);
	});

	it("passes date range to API", async () => {
		let capturedUrl: string | undefined;
		globalThis.fetch = (url: unknown) => {
			capturedUrl = url as string;
			return Promise.resolve(
				jsonResponse(
					JSON.stringify([
						[
							"urlkey",
							"timestamp",
							"original",
							"mimetype",
							"statuscode",
							"digest",
							"length",
						],
					]),
				),
			);
		};

		await searchArchives({
			url: "https://example.com",
			from: "2024-01-01",
			to: "2024-12-31",
		});

		assert.ok(capturedUrl?.includes("from=20240101"));
		assert.ok(capturedUrl?.includes("to=20241231"));
	});
});
