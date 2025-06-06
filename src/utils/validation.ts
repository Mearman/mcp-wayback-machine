/**
 * @fileoverview Common validation schemas and utilities for input validation
 * @module utils/validation
 */

import { z } from 'zod';

/**
 * Common validation schemas for reuse across tools
 */

/**
 * Schema for validating URL strings
 * @description Ensures the input is a valid URL format
 * @example
 * ```typescript
 * const validUrl = urlSchema.parse("https://example.com");
 * // Returns: "https://example.com"
 * ```
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Schema for validating date strings in YYYY-MM-DD format
 * @description Validates that the input matches the YYYY-MM-DD date format
 * @example
 * ```typescript
 * const validDate = dateSchema.parse("2024-01-15");
 * // Returns: "2024-01-15"
 * ```
 */
export const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Schema for validating timestamp strings in YYYYMMDDHHmmss format
 * @description Validates 14-digit timestamp strings commonly used by web archives
 * @example
 * ```typescript
 * const validTimestamp = timestampSchema.parse("20240115143022");
 * // Returns: "20240115143022" (2024-01-15 14:30:22)
 * ```
 */
export const timestampSchema = z
	.string()
	.regex(/^\d{14}$/, 'Timestamp must be in YYYYMMDDHHmmss format');

/**
 * Validate and parse input with helpful error messages
 * @param schema - Zod schema to validate against
 * @param input - Unknown input to validate
 * @returns Validated and typed input
 * @throws {Error} If validation fails, with formatted error messages
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * const validated = validateInput(schema, { name: "test" });
 * // Returns: { name: "test" } with TypeScript type inference
 * ```
 */
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
	try {
		return schema.parse(input);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
			throw new Error(`Validation failed:\n${issues.join('\n')}`);
		}
		throw error;
	}
}
