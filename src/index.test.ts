/**
 * @fileoverview Comprehensive tests for the MCP server entry point
 * @module index.test
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cliModule from './cli.js';
import { isCliMode, main, startMcpServer } from './index.js';
import * as exampleModule from './tools/example.js';

// Mock external dependencies
vi.mock('@modelcontextprotocol/sdk/server/index.js');
vi.mock('@modelcontextprotocol/sdk/server/stdio.js');
vi.mock('./cli.js');
vi.mock('./tools/example.js');

/**
 * Test suite for the MCP server module
 */
describe('MCP Server Entry Point', () => {
	// biome-ignore lint/suspicious/noExplicitAny: Test mocks
	let mockServer: any;
	// biome-ignore lint/suspicious/noExplicitAny: Test mocks
	let mockTransport: any;
	// biome-ignore lint/suspicious/noExplicitAny: Test mocks
	let mockProgram: any;
	let originalArgv: string[];

	beforeEach(() => {
		vi.clearAllMocks();

		// Store original argv
		originalArgv = [...process.argv];

		// Mock Server
		mockServer = {
			setRequestHandler: vi.fn(),
			connect: vi.fn(),
			close: vi.fn(),
		};
		// biome-ignore lint/suspicious/noExplicitAny: Test mocks
		vi.mocked(Server).mockImplementation(() => mockServer as any);

		// Mock Transport
		mockTransport = {};
		// biome-ignore lint/suspicious/noExplicitAny: Test mocks
		vi.mocked(StdioServerTransport).mockImplementation(() => mockTransport as any);

		// Mock CLI
		mockProgram = {
			parseAsync: vi.fn(),
		};
		// biome-ignore lint/suspicious/noExplicitAny: Test mocks
		vi.mocked(cliModule.createCLI).mockReturnValue(mockProgram as any);

		// Mock example tool
		vi.mocked(exampleModule.exampleTool).mockResolvedValue({
			content: [{ type: 'text', text: 'Test result' }],
		});
	});

	afterEach(() => {
		// Restore original argv
		process.argv = originalArgv;
	});

	/**
	 * Test that the server module can be imported as an ES module
	 */
	it('should export as ES module', async () => {
		const module = await import('./index.js');
		expect(module).toBeDefined();
	});

	/**
	 * Test CLI mode detection
	 */
	it('should detect CLI mode when arguments are provided', () => {
		// Set CLI mode (more than 2 arguments)
		process.argv = ['node', 'index.js', 'example', 'test'];
		expect(isCliMode()).toBe(true);
	});

	/**
	 * Test MCP mode detection
	 */
	it('should detect MCP mode when no CLI arguments provided', () => {
		// Set MCP mode (only 2 arguments: node and script name)
		process.argv = ['node', 'index.js'];
		expect(isCliMode()).toBe(false);
	});

	/**
	 * Test main function in CLI mode
	 */
	it('should run CLI when in CLI mode', async () => {
		process.argv = ['node', 'index.js', 'example', 'test'];

		await main();

		expect(cliModule.createCLI).toHaveBeenCalled();
		expect(mockProgram.parseAsync).toHaveBeenCalledWith(process.argv);
	});

	/**
	 * Test main function in MCP mode
	 */
	it('should start MCP server when in MCP mode', async () => {
		process.argv = ['node', 'index.js'];

		await main();

		expect(Server).toHaveBeenCalledWith(
			{ name: 'mcp-template', version: '0.1.0' },
			{ capabilities: { tools: {} } },
		);
		expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
	});

	/**
	 * Test server creation and setup
	 */
	it('should create MCP server with correct configuration', async () => {
		await startMcpServer();

		expect(Server).toHaveBeenCalledWith(
			{ name: 'mcp-template', version: '0.1.0' },
			{ capabilities: { tools: {} } },
		);
		expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
	});

	/**
	 * Test server request handlers registration
	 */
	it('should register ListTools and CallTool handlers', async () => {
		await startMcpServer();

		// Should register 2 handlers: ListTools and CallTool
		expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);

		// Check that the correct schemas are used
		const calls = mockServer.setRequestHandler.mock.calls;
		expect(calls[0][0]).toBe(ListToolsRequestSchema);
		expect(calls[1][0]).toBe(CallToolRequestSchema);
	});

	/**
	 * Test ListTools handler
	 */
	it('should handle ListTools requests correctly', async () => {
		await startMcpServer();

		// Get the ListTools handler
		const listToolsHandler = mockServer.setRequestHandler.mock.calls[0][1];

		const result = await listToolsHandler();
		expect(result.tools).toHaveLength(3);
		expect(result.tools[0]).toEqual({
			name: 'example_tool',
			description: 'An example tool that echoes back the input',
			inputSchema: expect.any(Object),
		});
		expect(result.tools[1]).toEqual({
			name: 'fetch_example',
			description:
				'Demonstrate configurable fetch patterns with different backends and caching',
			inputSchema: expect.any(Object),
		});
		expect(result.tools[2]).toEqual({
			name: 'configure_fetch',
			description: 'Configure the global fetch instance settings and caching behavior',
			inputSchema: expect.any(Object),
		});
	});

	/**
	 * Test CallTool handler for example tool
	 */
	it('should handle CallTool requests for example_tool', async () => {
		await startMcpServer();

		// Get the CallTool handler
		const callToolHandler = mockServer.setRequestHandler.mock.calls[1][1];

		const request = {
			params: {
				name: 'example_tool',
				arguments: { message: 'test', uppercase: false },
			},
		};

		const result = await callToolHandler(request);

		expect(exampleModule.exampleTool).toHaveBeenCalledWith({
			message: 'test',
			uppercase: false,
		});
		expect(result).toEqual({
			content: [{ type: 'text', text: 'Test result' }],
		});
	});

	/**
	 * Test CallTool handler error for unknown tool
	 */
	it('should throw error for unknown tool in CallTool request', async () => {
		await startMcpServer();

		// Get the CallTool handler
		const callToolHandler = mockServer.setRequestHandler.mock.calls[1][1];

		const request = {
			params: {
				name: 'unknown_tool',
				arguments: {},
			},
		};

		await expect(callToolHandler(request)).rejects.toThrow('Unknown tool: unknown_tool');
	});

	/**
	 * Test SIGINT handler registration
	 */
	it('should register SIGINT handler for graceful shutdown', async () => {
		const mockProcessOn = vi.spyOn(process, 'on').mockImplementation(() => process);
		const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('Process exit called');
		});

		await startMcpServer();

		// Find the SIGINT handler
		const sigintCall = mockProcessOn.mock.calls.find((call) => call[0] === 'SIGINT');
		expect(sigintCall).toBeDefined();

		if (sigintCall) {
			const sigintHandler = sigintCall[1] as () => Promise<void>;

			// Test the SIGINT handler
			try {
				await sigintHandler();
			} catch (error) {
				// Expected to throw due to process.exit mock
			}

			expect(mockServer.close).toHaveBeenCalled();
			expect(mockProcessExit).toHaveBeenCalledWith(0);
		}

		mockProcessOn.mockRestore();
		mockProcessExit.mockRestore();
	});
});
