/**
 * @fileoverview Unit tests for the example tool
 * @module tools/example.test
 */

import { describe, expect, it } from 'vitest';
import { exampleTool } from './example.js';

/**
 * Test suite for the example tool functionality
 */
describe('exampleTool', () => {
	/**
	 * Test that the tool correctly echoes back the input message
	 */
	it('should echo the message', async () => {
		const result = await exampleTool({ message: 'Hello, world!' });
		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'Echo: Hello, world!',
		});
	});

	/**
	 * Test that the uppercase option works correctly
	 */
	it('should convert to uppercase when requested', async () => {
		const result = await exampleTool({
			message: 'Hello, world!',
			uppercase: true,
		});
		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'Echo: HELLO, WORLD!',
		});
	});

	/**
	 * Test that invalid inputs are properly rejected with validation errors
	 */
	it('should validate input', async () => {
		await expect(exampleTool({})).rejects.toThrow();
		await expect(exampleTool({ message: 123 })).rejects.toThrow();
	});
});
