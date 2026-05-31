/**
 * Health check tool — returns server status without hitting external APIs.
 * Useful for connectivity tests, health checks, and as a lightweight
 * way for clients to verify the server is responding.
 */

import * as z from "zod";
import pkg from "../../package.json" with { type: "json" };

const VERSION = pkg.version;

export const Health = z.object({});

export type Health = z.output<typeof Health>;

interface HealthResult {
    status: string;
    version: string;
    server: string;
}

export function health(): HealthResult {
    return {
        status: "ok",
        version: VERSION,
        server: "mcp-wayback-machine",
    };
}
