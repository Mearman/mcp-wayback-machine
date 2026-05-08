/**
 * Common validation schemas and utilities for input validation
 */

import { z } from "zod";

/**
 * Schema for validating URL strings
 */
export const urlSchema = z.url("Invalid URL format");

/**
 * Schema for validating date strings in YYYY-MM-DD format
 */
export const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

/**
 * Schema for validating timestamp strings in YYYYMMDDHHmmss format
 */
export const timestampSchema = z
	.string()
	.regex(/^\d{14}$/, "Timestamp must be in YYYYMMDDHHmmss format");

/**
 * Validate and parse input with helpful error messages
 */
export function validateInput<T>(schema: z.ZodType<T>, input: unknown): T {
	try {
		return schema.parse(input);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues.map(
				(issue) => `${issue.path.join(".")}: ${issue.message}`,
			);
			throw new Error(`Validation failed:\n${issues.join("\n")}`, {
				cause: error,
			});
		}
		throw error;
	}
}

/**
 * Validate URL format and return sanitised URL
 */
export function validateUrl(url: string): string {
	return urlSchema.parse(url);
}

/**
 * Format timestamp to human-readable string
 */
export function formatTimestamp(timestamp: string): string {
	const validated = timestampSchema.parse(timestamp);
	const year = validated.slice(0, 4);
	const month = validated.slice(4, 6);
	const day = validated.slice(6, 8);
	const hour = validated.slice(8, 10);
	const minute = validated.slice(10, 12);
	const second = validated.slice(12, 14);

	return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
