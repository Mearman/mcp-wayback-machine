import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCLI } from './cli.js';
import * as retrieveModule from './tools/retrieve.js';
import * as saveModule from './tools/save.js';
import * as searchModule from './tools/search.js';
import * as statusModule from './tools/status.js';

vi.mock('./tools/save.js');
vi.mock('./tools/retrieve.js');
vi.mock('./tools/search.js');
vi.mock('./tools/status.js');

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
		expect(program.name()).toBe('wayback');
		expect(program.description()).toContain('Wayback Machine');
	});

	it('should handle save command', async () => {
		vi.spyOn(saveModule, 'saveUrl').mockResolvedValue({
			success: true,
			message: 'Saved',
			archivedUrl: 'https://web.archive.org/web/123/https://example.com',
			timestamp: '123',
		});

		const program = createCLI();
		await program.parseAsync(['node', 'cli', 'save', 'https://example.com']);

		expect(saveModule.saveUrl).toHaveBeenCalledWith({ url: 'https://example.com' });
	});

	it('should handle get command', async () => {
		vi.spyOn(retrieveModule, 'getArchivedUrl').mockResolvedValue({
			success: true,
			message: 'Archive found',
			available: true,
			archivedUrl: 'https://web.archive.org/web/123/https://example.com',
			timestamp: '123',
		});

		const program = createCLI();
		await program.parseAsync(['node', 'cli', 'get', 'https://example.com']);

		expect(retrieveModule.getArchivedUrl).toHaveBeenCalledWith({
			url: 'https://example.com',
			timestamp: undefined,
		});
	});

	it('should handle search command', async () => {
		vi.spyOn(searchModule, 'searchArchives').mockResolvedValue({
			success: true,
			message: 'Found archives',
			results: [
				{
					url: 'https://example.com',
					archivedUrl: 'https://web.archive.org/web/123/https://example.com',
					timestamp: '123',
					date: '2023-01-01',
					statusCode: '200',
					mimeType: 'text/html',
				},
			],
			totalResults: 1,
		});

		const program = createCLI();
		await program.parseAsync(['node', 'cli', 'search', 'https://example.com']);

		expect(searchModule.searchArchives).toHaveBeenCalledWith({
			url: 'https://example.com',
			limit: 10,
		});
	});

	it('should handle status command', async () => {
		vi.spyOn(statusModule, 'checkArchiveStatus').mockResolvedValue({
			success: true,
			message: 'Status checked',
			isArchived: true,
			totalCaptures: 100,
			firstCapture: '2020-01-01',
			lastCapture: '2023-12-31',
		});

		const program = createCLI();
		await program.parseAsync(['node', 'cli', 'status', 'https://example.com']);

		expect(statusModule.checkArchiveStatus).toHaveBeenCalledWith({
			url: 'https://example.com',
		});
	});
});
