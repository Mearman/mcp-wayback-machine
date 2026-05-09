import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Timestamp, formatTimestamp } from "../../src/utils/validation.ts";

describe("Timestamp", () => {
    it("accepts valid 14-digit timestamps", () => {
        assert.equal(Timestamp.parse("20240115143022"), "20240115143022");
    });

    it("rejects short timestamps", () => {
        assert.throws(() => Timestamp.parse("20240115"), /YYYYMMDD/);
    });

    it("rejects non-numeric input", () => {
        assert.throws(() => Timestamp.parse("aaaaaaaaaaaaaa"), /YYYYMMDD/);
    });
});

describe("formatTimestamp", () => {
    it("formats a 14-digit timestamp", () => {
        assert.equal(formatTimestamp("20240115143022"), "2024-01-15 14:30:22");
    });

    it("returns short strings unchanged", () => {
        assert.equal(formatTimestamp("short"), "short");
    });
});
