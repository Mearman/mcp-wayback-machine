import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { checkArchiveStatus } from "../../src/tools/status.js";
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

describe("checkArchiveStatus", () => {
	it("returns statistics from sparkline API", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse(
					JSON.stringify({
						first_ts: "20200101000000",
						last_ts: "20241231235959",
						years: {
							"2020": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
							"2024": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
						},
						captures: 96,
					}),
				),
			);

		const result = await checkArchiveStatus({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.isArchived, true);
		assert.equal(result.firstCapture, "2020-01-01");
		assert.equal(result.lastCapture, "2024-12-31");
		assert.equal(result.totalCaptures, 96);
		assert.equal(result.yearlyCaptures?.["2020"], 78);
		assert.equal(result.yearlyCaptures["2024"], 60);
	});

	it("omits lastCapture when not provided", async () => {
		globalThis.fetch = () =>
			Promise.resolve(
				jsonResponse(
					JSON.stringify({
						first_ts: "20200101000000",
						captures: 5,
					}),
				),
			);

		const result = await checkArchiveStatus({ url: "https://example.com" });

		assert.equal(result.isArchived, true);
		assert.equal(result.lastCapture, undefined);
		assert.equal(result.totalCaptures, 5);
	});

	it("falls back to availability API", async () => {
		let callCount = 0;
		globalThis.fetch = () => {
			callCount++;
			if (callCount === 1) {
				// Sparkline returns no first_ts
				return Promise.resolve(jsonResponse(JSON.stringify({})));
			}
			// Availability API fallback
			return Promise.resolve(
				jsonResponse(
					JSON.stringify({
						archived_snapshots: {
							closest: {
								available: true,
								timestamp: "20240615120000",
							},
						},
					}),
				),
			);
		};

		const result = await checkArchiveStatus({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.isArchived, true);
		assert.equal(result.lastCapture, "20240615120000");
	});

	it("returns not archived when neither API has data", async () => {
		let callCount = 0;
		globalThis.fetch = () => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve(jsonResponse(JSON.stringify({})));
			}
			return Promise.resolve(
				jsonResponse(
					JSON.stringify({
						archived_snapshots: {
							closest: {
								available: false,
								timestamp: "20240101120000",
								status: "404",
								url: "https://example.com",
							},
						},
					}),
				),
			);
		};

		const result = await checkArchiveStatus({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.isArchived, false);
		assert.equal(result.totalCaptures, 0);
	});

	it("handles 404 as not archived", async () => {
		globalThis.fetch = () =>
			Promise.resolve(jsonResponse("not found", 404));

		const result = await checkArchiveStatus({ url: "https://example.com" });

		assert.equal(result.success, true);
		assert.equal(result.isArchived, false);
	});

	it("handles HTTP errors", async () => {
		globalThis.fetch = () => Promise.resolve(jsonResponse("error", 500));

		const result = await checkArchiveStatus({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.equal(result.isArchived, false);
		assert.match(result.message, /Failed to check/);
	});

	it("handles network errors", async () => {
		globalThis.fetch = () => Promise.reject(new Error("timeout"));

		const result = await checkArchiveStatus({ url: "https://example.com" });

		assert.equal(result.success, false);
		assert.match(result.message, /timeout/);
	});

	it("rejects invalid URLs", async () => {
		const result = await checkArchiveStatus({ url: "not-a-url" });

		assert.equal(result.success, false);
	});
});
