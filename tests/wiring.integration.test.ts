/**
 * Tests for production wiring — contexts.ts, cli.ts, bin.ts.
 * Ensures the DI chain assembles correctly and entry points export expected shapes.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { context } from "../src/contexts.ts";
import { createCLI } from "../src/cli.ts";
import { createServer } from "../src/server.ts";

describe("contexts.ts", () => {
    it("exports a ToolContext with fetch and fetchJSON", () => {
        assert.equal(typeof context.fetch, "function");
        assert.equal(typeof context.fetchJSON, "function");
    });
});

describe("cli.ts", () => {
    it("exports a createCLI function that returns a Commander program", () => {
        const program = createCLI();
        assert.equal(program.name(), "wayback");
    });
});

describe("bin.ts server creation", () => {
    it("createServer with production context produces a server", () => {
        const server = createServer(context);
        assert.ok(server);
    });
});
