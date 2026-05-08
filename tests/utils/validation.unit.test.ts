import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
	urlSchema,
	dateSchema,
	timestampSchema,
	validateInput,
	validateUrl,
	formatTimestamp,
} from "../../src/utils/validation.js";

describe("urlSchema", () => {
	it("accepts valid URLs", () => {
		assert.equal(
			urlSchema.parse("https://example.com"),
			"https://example.com",
		);
	});

	it("rejects invalid URLs", () => {
		assert.throws(() => urlSchema.parse("not-a-url"), /Invalid URL/);
	});
});

describe("dateSchema", () => {
	it("accepts valid dates", () => {
		assert.equal(dateSchema.parse("2024-01-15"), "2024-01-15");
	});

	it("rejects invalid date formats", () => {
		assert.throws(() => dateSchema.parse("2024/01/15"), /YYYY-MM-DD/);
		assert.throws(() => dateSchema.parse("15-01-2024"), /YYYY-MM-DD/);
	});
});

describe("timestampSchema", () => {
	it("accepts valid 14-digit timestamps", () => {
		assert.equal(timestampSchema.parse("20240115143022"), "20240115143022");
	});

	it("rejects short timestamps", () => {
		assert.throws(() => timestampSchema.parse("20240115"), /YYYYMMDD/);
	});

	it("rejects non-numeric input", () => {
		assert.throws(
			() => timestampSchema.parse("aaaaaaaaaaaaaa"),
			/YYYYMMDD/,
		);
	});
});

describe("validateInput", () => {
	it("returns parsed value on success", () => {
		const schema = z.object({ name: z.string() });
		const result = validateInput(schema, { name: "test" });
		assert.deepEqual(result, { name: "test" });
	});

	it("throws formatted error on ZodError", () => {
		const schema = z.object({ name: z.string() });
		assert.throws(
			() => validateInput(schema, { name: 123 }),
			/Validation failed/,
		);
	});

	it("re-throws non-Zod errors", () => {
		const schema = {
			parse: () => {
				throw new Error("custom error");
			},
		} as unknown as z.ZodType;
		assert.throws(() => validateInput(schema, {}), /custom error/);
	});
});

describe("validateUrl", () => {
	it("returns valid URLs", () => {
		assert.equal(validateUrl("https://example.com"), "https://example.com");
	});

	it("throws on invalid URLs", () => {
		assert.throws(() => validateUrl("not-a-url"));
	});
});

describe("formatTimestamp", () => {
	it("formats a 14-digit timestamp", () => {
		assert.equal(formatTimestamp("20240115143022"), "2024-01-15 14:30:22");
	});

	it("rejects invalid timestamps", () => {
		assert.throws(() => formatTimestamp("short"));
	});
});
