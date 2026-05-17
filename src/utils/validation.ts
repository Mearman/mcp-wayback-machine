/**
 * Common validation schemas and formatting utilities.
 */

import * as z from "zod";

/**
 * Validates YYYYMMDDHHmmss timestamps.
 */
export const Timestamp = z
    .string()
    .trim()
    .regex(/^\d{14}$/, "Timestamp must be in YYYYMMDDhhmmss format");

/**
 * Validates an http(s) URL. Rejects javascript:, file:, data:, ftp:, etc.
 */
export const HttpUrl = z
    .url()
    .refine(
        (u) => /^https?:\/\//i.test(u),
        "URL must use http or https scheme"
    );

/**
 * Format a YYYYMMDDHHmmss timestamp to human-readable form.
 * Returns the input unchanged if it's not 14 characters.
 */
export function formatTimestamp(timestamp: string): string {
    if (timestamp.length !== 14) {
        return timestamp;
    }
    return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)} ${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)}`;
}
