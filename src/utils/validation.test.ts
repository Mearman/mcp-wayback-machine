import { describe, expect, it } from 'vitest';
import { formatTimestamp, validateUrl } from './validation.js';

describe('validateUrl', () => {
	it('should accept valid HTTP URLs', () => {
		expect(validateUrl('http://example.com')).toBe('http://example.com/');
		expect(validateUrl('https://example.com')).toBe('https://example.com/');
		expect(validateUrl('https://example.com/path')).toBe('https://example.com/path');
		expect(validateUrl('https://example.com/path?query=1')).toBe(
			'https://example.com/path?query=1',
		);
	});

	it('should reject invalid URLs', () => {
		expect(() => validateUrl('not a url')).toThrow('Invalid URL');
		expect(() => validateUrl('ftp://example.com')).toThrow(
			'Only HTTP and HTTPS URLs are supported',
		);
		expect(() => validateUrl('javascript:alert(1)')).toThrow(
			'Only HTTP and HTTPS URLs are supported',
		);
	});
});

describe('formatTimestamp', () => {
	it('should return undefined for latest', () => {
		expect(formatTimestamp('latest')).toBeUndefined();
		expect(formatTimestamp()).toBeUndefined();
		expect(formatTimestamp('')).toBeUndefined();
	});

	it('should accept valid timestamps', () => {
		expect(formatTimestamp('2023')).toBe('2023');
		expect(formatTimestamp('202312')).toBe('202312');
		expect(formatTimestamp('20231225')).toBe('20231225');
		expect(formatTimestamp('20231225123045')).toBe('20231225123045');
	});

	it('should clean timestamps', () => {
		expect(formatTimestamp('2023-12-25')).toBe('20231225');
		expect(formatTimestamp('2023/12/25 12:30:45')).toBe('20231225123045');
	});

	it('should reject invalid timestamps', () => {
		expect(() => formatTimestamp('202')).toThrow('Timestamp must be in format');
		expect(() => formatTimestamp('202312251230456')).toThrow('Timestamp must be in format');
		expect(() => formatTimestamp('1995')).toThrow('Year must be between 1996');
		expect(() => formatTimestamp('2099')).toThrow('Year must be between 1996');
		expect(() => formatTimestamp('202313')).toThrow('Month must be between');
		expect(() => formatTimestamp('20231232')).toThrow('Day must be between');
	});
});
