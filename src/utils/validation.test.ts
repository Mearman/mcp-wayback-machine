/**
 * @fileoverview Unit tests for validation utilities and schemas
 * @module utils/validation.test
 */

import { describe, expect, it } from 'vitest';
import { dateSchema, timestampSchema, urlSchema, validateInput } from './validation.js';

/**
 * Test suite for validation schemas
 */
describe('validation schemas', () => {
	/**
	 * Tests for URL validation schema
	 */
	describe('urlSchema', () => {
		it('should accept valid URLs', () => {
			expect(urlSchema.parse('https://example.com')).toBe('https://example.com');
			expect(urlSchema.parse('http://example.com/path')).toBe('http://example.com/path');
		});

		it('should reject invalid URLs', () => {
			expect(() => urlSchema.parse('not a url')).toThrow();
			expect(() => urlSchema.parse('example.com')).toThrow();
		});
	});

	/**
	 * Tests for date validation schema (YYYY-MM-DD format)
	 */
	describe('dateSchema', () => {
		it('should accept valid dates', () => {
			expect(dateSchema.parse('2024-01-01')).toBe('2024-01-01');
			expect(dateSchema.parse('2024-12-31')).toBe('2024-12-31');
		});

		it('should reject invalid dates', () => {
			expect(() => dateSchema.parse('2024-1-1')).toThrow();
			expect(() => dateSchema.parse('01-01-2024')).toThrow();
			expect(() => dateSchema.parse('2024/01/01')).toThrow();
		});
	});

	/**
	 * Tests for timestamp validation schema (YYYYMMDDHHmmss format)
	 */
	describe('timestampSchema', () => {
		it('should accept valid timestamps', () => {
			expect(timestampSchema.parse('20240101120000')).toBe('20240101120000');
		});

		it('should reject invalid timestamps', () => {
			expect(() => timestampSchema.parse('2024-01-01')).toThrow();
			expect(() => timestampSchema.parse('202401011200')).toThrow();
		});
	});
});

/**
 * Test suite for the validateInput utility function
 */
describe('validateInput', () => {
	it('should return parsed value for valid input', () => {
		const result = validateInput(urlSchema, 'https://example.com');
		expect(result).toBe('https://example.com');
	});

	it('should throw formatted error for invalid input', () => {
		expect(() => validateInput(urlSchema, 'invalid')).toThrow('Validation failed');
	});

	it('should re-throw non-ZodError errors', () => {
		// Create a schema that throws a non-ZodError
		const faultySchema = {
			parse: () => {
				throw new Error('Not a ZodError');
			},
			// biome-ignore lint/suspicious/noExplicitAny: Testing error handling
		} as any;

		expect(() => validateInput(faultySchema, 'input')).toThrow('Not a ZodError');
	});
});
