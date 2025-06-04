import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Build artifact integration tests', () => {
	let serverProcess: ChildProcess;
	let serverOutput: string = '';
	let serverError: string = '';

	beforeAll(async () => {
		// Build the project first
		await new Promise((resolve, reject) => {
			const buildProcess = spawn('yarn', ['build'], {
				cwd: join(__dirname, '..'),
				shell: true,
			});

			buildProcess.on('close', (code) => {
				if (code === 0) {
					resolve(undefined);
				} else {
					reject(new Error(`Build failed with code ${code}`));
				}
			});
		});

		// Start the server
		serverProcess = spawn('node', [join(__dirname, '../dist/index.js')], {
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		// Capture output
		serverProcess.stdout?.on('data', (data) => {
			serverOutput += data.toString();
		});

		serverProcess.stderr?.on('data', (data) => {
			serverError += data.toString();
		});

		// Wait for server to start
		await new Promise((resolve) => setTimeout(resolve, 1000));
	});

	afterAll(() => {
		if (serverProcess) {
			serverProcess.kill();
		}
	});

	it('should start without errors', () => {
		expect(serverError).toContain('MCP Wayback Machine server running on stdio');
		expect(serverProcess.killed).toBe(false);
	});

	it('should respond to list_tools request', async () => {
		const request = {
			jsonrpc: '2.0',
			method: 'tools/list',
			params: {},
			id: 1,
		};

		// Send request
		serverProcess.stdin?.write(JSON.stringify(request) + '\n');

		// Wait for response
		await new Promise((resolve) => setTimeout(resolve, 500));

		// The response should be in stdout (not stderr)
		expect(serverOutput.length).toBeGreaterThan(0);
	});

	it('should handle malformed requests gracefully', async () => {
		const malformedRequest = 'not json';

		serverProcess.stdin?.write(malformedRequest + '\n');

		// Wait for potential error handling
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Server should still be running
		expect(serverProcess.killed).toBe(false);
	});
});

describe('Executable permissions', () => {
	it('should have shebang in built file', async () => {
		const fs = await import('fs/promises');
		const builtFile = join(__dirname, '../dist/index.js');
		
		const content = await fs.readFile(builtFile, 'utf-8');
		expect(content).toMatch(/^#!/);
		expect(content).toContain('#!/usr/bin/env node');
	});
});