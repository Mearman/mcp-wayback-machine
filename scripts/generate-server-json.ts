/**
 * Generate server.json for the MCP Registry from package.json.
 *
 * Reads name, version, description, and repository from package.json —
 * the single source of truth. MCP-specific metadata (title, transport,
 * runtime hint, environment variables) is defined below.
 *
 * Usage:
 *   node --experimental-strip-types scripts/generate-server-json.ts
 *
 * Outputs server.json to cwd. Run after semantic-release bumps package.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface PackageJson {
    name: string;
    mcpName: string;
    version: string;
    description: string;
    repository: {
        type: string;
        url: string;
    };
}

/**
 * MCP-specific metadata not present in package.json.
 * Edit these when the server's capabilities or configuration change.
 */
const MCP_META = {
    title: "Wayback Machine",

    transport: {
        type: "stdio" as const,
    },

    runtimeHint: "npx",

    environmentVariables: [
        {
            name: "WAYBACK_ACCESS_KEY",
            description:
                "Internet Archive S3 access key for higher SPN2 rate limits. Optional — anonymous mode works without it.",
            isRequired: false,
            isSecret: true,
            format: "string",
        },
        {
            name: "WAYBACK_SECRET_KEY",
            description:
                "Internet Archive S3 secret key for higher SPN2 rate limits. Optional — anonymous mode works without it.",
            isRequired: false,
            isSecret: true,
            format: "string",
        },
    ],
} as const;

const packageJsonPath = resolve(__dirname, "../package.json");
const packageJson: PackageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf-8"),
);

/**
 * Extract GitHub owner and repo from the repository URL.
 */
function parseRepository(
    url: string,
): { url: string; source: string } {
    // git+https://github.com/owner/repo.git → https://github.com/owner/repo
    const cleanUrl = url
        .replace(/^git\+/, "")
        .replace(/\.git$/, "");

    return {
        url: cleanUrl,
        source: "github",
    };
}

const serverJson = {
    $schema:
        "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
    name: packageJson.mcpName,
    title: MCP_META.title,
    description: packageJson.description,
    version: packageJson.version,
    repository: parseRepository(packageJson.repository.url),
    packages: [
        {
            registryType: "npm",
            identifier: packageJson.name,
            version: packageJson.version,
            transport: MCP_META.transport,
            runtimeHint: MCP_META.runtimeHint,
            environmentVariables: MCP_META.environmentVariables,
        },
    ],
};

const outputPath = resolve(__dirname, "../server.json");
writeFileSync(outputPath, JSON.stringify(serverJson, null, 4) + "\n");

console.log(`Generated server.json v${packageJson.version}`);
