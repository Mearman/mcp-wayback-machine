import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.d.ts', 'vitest.config.ts'],
			all: true,
			lines: 80,
			functions: 80,
			branches: 80,
			statements: 80,
		},
	},
});
