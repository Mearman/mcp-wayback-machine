import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { StaticTokenAuthProvider } from "../../src/auth/provider.ts";

const TOKEN = "test-secret-token-abc123";

describe("StaticTokenAuthProvider", () => {
    const provider = new StaticTokenAuthProvider(TOKEN);

    it("allows requests with valid Bearer token", async () => {
        const request = new Request("https://example.com/mcp", {
            headers: { Authorization: `Bearer ${TOKEN}` },
        });
        const result = await provider.validate(request);
        assert.equal(result, undefined);
    });

    it("rejects requests with no Authorization header", async () => {
        const request = new Request("https://example.com/mcp");
        const result = await provider.validate(request);
        assert.ok(result !== undefined);
        assert.equal(result!.status, 401);
    });

    it("rejects requests with wrong token", async () => {
        const request = new Request("https://example.com/mcp", {
            headers: { Authorization: "Bearer wrong-token" },
        });
        const result = await provider.validate(request);
        assert.ok(result !== undefined);
        assert.equal(result!.status, 401);
    });

    it("rejects requests with malformed Authorization header", async () => {
        const request = new Request("https://example.com/mcp", {
            headers: { Authorization: "Basic abc123" },
        });
        const result = await provider.validate(request);
        assert.ok(result !== undefined);
        assert.equal(result!.status, 401);
    });

    it("includes WWW-Authenticate header on rejection", async () => {
        const request = new Request("https://example.com/mcp");
        const result = await provider.validate(request);
        assert.ok(result !== undefined);
        assert.equal(
            result!.headers.get("WWW-Authenticate"),
            'Bearer realm="mcp-wayback-machine"'
        );
    });
});
