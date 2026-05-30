/**
 * Lint-staged configuration for mcp-wayback-machine.
 *
 * ESLint handles linting; Prettier handles formatting independently.
 */
export default {
    "*.{ts,tsx}": ["eslint --cache --fix", "prettier --write"],
};
