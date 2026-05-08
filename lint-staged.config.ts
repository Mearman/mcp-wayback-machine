/**
 * Lint-staged configuration for mcp-wayback-machine.
 *
 * Prettier runs as an ESLint rule via eslint-plugin-prettier,
 * so eslint --fix handles both linting and formatting.
 */
export default {
	"*.{ts,tsx}": ["eslint --cache --fix"],
};
