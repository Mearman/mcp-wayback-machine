/**
 * @fileoverview Example tool implementation demonstrating MCP tool structure
 * @module tools/example
 */

import { z } from 'zod';

/**
 * Input schema for the example tool
 * @description Validates input parameters for the echo tool
 */
export const ExampleToolSchema = z.object({
	message: z.string().describe('The message to echo back'),
	uppercase: z
		.boolean()
		.optional()
		.default(false)
		.describe('Whether to return the message in uppercase'),
});

/**
 * TypeScript type for the example tool input
 */
export type ExampleToolInput = z.infer<typeof ExampleToolSchema>;

/**
 * Example tool that echoes back the input message
 * @param args - Raw input arguments to be validated against ExampleToolSchema
 * @returns MCP tool response with the echoed message
 * @throws {z.ZodError} If input validation fails
 *
 * @example
 * ```typescript
 * const result = await exampleTool({ message: "Hello", uppercase: true });
 * // Returns: { content: [{ type: 'text', text: 'Echo: HELLO' }] }
 * ```
 */
export async function exampleTool(args: unknown) {
	const input = ExampleToolSchema.parse(args);

	let result = input.message;
	if (input.uppercase) {
		result = result.toUpperCase();
	}

	return {
		content: [
			{
				type: 'text',
				text: `Echo: ${result}`,
			},
		],
	};
}
