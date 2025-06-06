import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCLI } from './cli.js';
import * as exampleModule from './tools/example.js';
import * as fetchExampleModule from './tools/fetch-example.js';

vi.mock('./tools/example.js');
vi.mock('./tools/fetch-example.js');

describe('CLI', () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('should create CLI program', () => {
		const program = createCLI();
		expect(program.name()).toBe('mcp-template');
		expect(program.description()).toContain('MCP template');
	});

	it('should handle example command', async () => {
		vi.spyOn(exampleModule, 'exampleTool').mockResolvedValue({
			content: [
				{
					type: 'text',
					text: 'Echo: Hello World',
				},
			],
		});

		const program = createCLI();
		await program.parseAsync(['node', 'cli', 'example', 'Hello World']);

		expect(exampleModule.exampleTool).toHaveBeenCalledWith({
			message: 'Hello World',
			uppercase: false,
		});
	});

	it('should handle example command with uppercase option', async () => {
		vi.spyOn(exampleModule, 'exampleTool').mockResolvedValue({
			content: [
				{
					type: 'text',
					text: 'Echo: HELLO WORLD',
				},
			],
		});

		const program = createCLI();
		await program.parseAsync(['node', 'cli', 'example', 'Hello World', '--uppercase']);

		expect(exampleModule.exampleTool).toHaveBeenCalledWith({
			message: 'Hello World',
			uppercase: true,
		});
	});

	it('should handle errors gracefully', async () => {
		const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('Process exit called');
		});

		vi.spyOn(exampleModule, 'exampleTool').mockRejectedValue(new Error('Test error'));

		const program = createCLI();

		try {
			await program.parseAsync(['node', 'cli', 'example', 'Hello World']);
		} catch (error) {
			// Expected to throw due to process.exit mock
		}

		expect(mockProcessExit).toHaveBeenCalledWith(1);
		mockProcessExit.mockRestore();
	});

	it('should handle fetch-example command', async () => {
		vi.spyOn(fetchExampleModule, 'fetchExampleTool').mockResolvedValue({
			content: [
				{
					type: 'text',
					text: '# Fetch Example Results\n\nURL: https://httpbin.org/json\nStatus: 200 OK',
				},
			],
			isError: false,
		});

		const program = createCLI();
		await program.parseAsync(['node', 'cli', 'fetch-example', 'https://httpbin.org/json']);

		expect(fetchExampleModule.fetchExampleTool).toHaveBeenCalledWith({
			url: 'https://httpbin.org/json',
		});
	});

	it('should handle fetch-example command with options', async () => {
		vi.spyOn(fetchExampleModule, 'fetchExampleTool').mockResolvedValue({
			content: [
				{
					type: 'text',
					text: '# Fetch Example Results\n\nURL: https://httpbin.org/json\nBackend: cache-memory',
				},
			],
			isError: false,
		});

		const program = createCLI();
		await program.parseAsync([
			'node',
			'cli',
			'fetch-example',
			'https://httpbin.org/json',
			'--backend',
			'cache-memory',
			'--no-cache',
			'--user-agent',
			'Test-Agent/1.0',
		]);

		expect(fetchExampleModule.fetchExampleTool).toHaveBeenCalledWith({
			url: 'https://httpbin.org/json',
			backend: 'cache-memory',
			no_cache: true,
			user_agent: 'Test-Agent/1.0',
		});
	});

	it('should handle configure-fetch command', async () => {
		vi.spyOn(fetchExampleModule, 'configureFetchTool').mockResolvedValue({
			content: [
				{
					type: 'text',
					text: '# Fetch Configuration Updated\n\nBackend: cache-disk\nCache TTL: 60000ms',
				},
			],
			isError: false,
		});

		const program = createCLI();
		await program.parseAsync([
			'node',
			'cli',
			'configure-fetch',
			'--backend',
			'cache-disk',
			'--cache-ttl',
			'60000',
			'--clear-cache',
		]);

		expect(fetchExampleModule.configureFetchTool).toHaveBeenCalledWith({
			backend: 'cache-disk',
			cache_ttl: 60000,
			clear_cache: true,
		});
	});

	it('should handle fetch-example errors', async () => {
		const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('Process exit called');
		});

		vi.spyOn(fetchExampleModule, 'fetchExampleTool').mockResolvedValue({
			content: [
				{
					type: 'text',
					text: 'Network error occurred',
				},
			],
			isError: true,
		});

		const program = createCLI();

		try {
			await program.parseAsync(['node', 'cli', 'fetch-example', 'https://invalid-url']);
		} catch (error) {
			// Expected to throw due to process.exit mock
		}

		expect(mockProcessExit).toHaveBeenCalledWith(1);
		mockProcessExit.mockRestore();
	});
});
