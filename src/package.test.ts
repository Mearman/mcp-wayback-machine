import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Package configuration', () => {
	const packageJson = JSON.parse(
		readFileSync(join(__dirname, '../package.json'), 'utf-8')
	);

	it('should have correct bin configuration', () => {
		expect(packageJson.bin).toBeDefined();
		// Handle both string and object forms of bin
		if (typeof packageJson.bin === 'string') {
			// If bin is a string, it should be the path directly
			expect(packageJson.bin).toBe('dist/index.js');
		} else {
			// If bin is an object, check the property
			expect(typeof packageJson.bin).toBe('object');
			expect(packageJson.bin).toHaveProperty('mcp-wayback-machine');
			expect(packageJson.bin['mcp-wayback-machine']).toBe('dist/index.js');
		}
	});

	it('should have correct main entry point', () => {
		expect(packageJson.main).toBe('dist/index.js');
	});

	it('should be configured as ES module', () => {
		expect(packageJson.type).toBe('module');
	});

	it('should have all required dependencies', () => {
		expect(packageJson.dependencies).toHaveProperty('@modelcontextprotocol/sdk');
		expect(packageJson.dependencies).toHaveProperty('zod');
	});

	it('should have correct repository information', () => {
		expect(packageJson.repository.url).toBe('git+https://github.com/Mearman/mcp-wayback-machine.git');
		expect(packageJson.author).toBe('Joseph Mearman');
	});

	it('should include necessary files in npm package', () => {
		expect(packageJson.files).toContain('dist/**/*.js');
		expect(packageJson.files).toContain('dist/**/*.d.ts');
		expect(packageJson.files).toContain('LICENSE');
		expect(packageJson.files).toContain('README.md');
	});

	it('should have required scripts', () => {
		expect(packageJson.scripts).toHaveProperty('build');
		expect(packageJson.scripts).toHaveProperty('test');
		expect(packageJson.scripts).toHaveProperty('start');
		expect(packageJson.scripts).toHaveProperty('prepublishOnly');
	});
});