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
 * Maximum bytes of archived snapshot content to return to the LLM.
 * Caps memory use and token blowup; large snapshots are truncated with a
 * clearly visible marker.
 */
export const MAX_SNAPSHOT_BYTES = 200_000;

/**
 * Truncate a snapshot body to MAX_SNAPSHOT_BYTES with a clear marker.
 */
export function capContent(body: string): string {
    if (body.length <= MAX_SNAPSHOT_BYTES) {
        return body;
    }
    return `${body.slice(0, MAX_SNAPSHOT_BYTES)}
... [truncated: snapshot exceeded ${String(MAX_SNAPSHOT_BYTES)} bytes]`;
}

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
