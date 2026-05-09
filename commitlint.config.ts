import type { UserConfig } from "@commitlint/types";

/**
 * Commitlint configuration for mcp-wayback-machine.
 *
 * Enforces conventional commits with optional scope validation.
 * Format: type(scope): description
 *
 * Allowed scopes match source module structure.
 * Commits must use British English spelling and grammar.
 */
const config: UserConfig = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "scope-enum": [
            2,
            "always",
            [
                // Source modules
                "retrieve",
                "save",
                "search",
                "status",
                "fetch",
                "http",
                "validation",
                "cli",
                // Build/tooling
                "build",
                "release",
                "ci",
                "deps",
            ],
        ],
    },
};

export default config;
