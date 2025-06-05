/**
 * URL validation utilities
 */

/**
 * Validate and normalize a URL
 */
export function validateUrl(url: string): string {
	try {
		const parsed = new URL(url);

		// Only allow http and https protocols
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			throw new Error('Only HTTP and HTTPS URLs are supported');
		}

		return parsed.href;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Invalid URL: ${error.message}`);
		}
		throw new Error('Invalid URL format');
	}
}

/**
 * Format a timestamp for Wayback Machine API
 * Accepts: YYYY, YYYYMM, YYYYMMDD, or YYYYMMDDhhmmss
 */
export function formatTimestamp(timestamp?: string): string | undefined {
	if (!timestamp || timestamp === 'latest') {
		return undefined;
	}

	// Remove any non-digits
	const cleaned = timestamp.replace(/\D/g, '');

	// Validate length (4-14 digits)
	if (cleaned.length < 4 || cleaned.length > 14) {
		throw new Error('Timestamp must be in format: YYYY, YYYYMM, YYYYMMDD, or YYYYMMDDhhmmss');
	}

	// Validate year
	const year = Number.parseInt(cleaned.substring(0, 4));
	if (year < 1996 || year > new Date().getFullYear()) {
		throw new Error('Year must be between 1996 and current year');
	}

	// Validate month if present
	if (cleaned.length >= 6) {
		const month = Number.parseInt(cleaned.substring(4, 6));
		if (month < 1 || month > 12) {
			throw new Error('Month must be between 01 and 12');
		}
	}

	// Validate day if present
	if (cleaned.length >= 8) {
		const day = Number.parseInt(cleaned.substring(6, 8));
		if (day < 1 || day > 31) {
			throw new Error('Day must be between 01 and 31');
		}
	}

	return cleaned;
}
