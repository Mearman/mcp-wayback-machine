/**
 * Shared Zod schemas for Wayback Machine API responses.
 * Schema and type share the same name — TypeScript has separate value and type namespaces.
 */

import * as z from "zod";

/**

 * CDX API response — array of string arrays, first row is column headers.

 */
export const CdxResponse = z.array(z.array(z.string().trim()));
export type CdxResponse = z.output<typeof CdxResponse>;

/**

 * Availability API response — closest archived snapshot for a URL.

 */
export const AvailabilityResponse = z.object({
    url: z.string().trim(),
    archived_snapshots: z.object({
        closest: z
            .object({
                status: z.string().trim(),
                available: z.boolean(),
                url: z.string().trim(),
                timestamp: z.string().trim(),
            })
            .optional(),
    }),
});
export type AvailabilityResponse = z.output<typeof AvailabilityResponse>;

/**

 * Sparkline API response — yearly capture counts for a URL.

 */
export const SparklineResponse = z.object({
    years: z
        .record(z.string(), z.object({ "timeseries-csp": z.array(z.number()) }))
        .optional(),
});
export type SparklineResponse = z.output<typeof SparklineResponse>;

/**

 * SPN2 Save API response — job details after submitting a URL for archiving.

 */
export const SaveJobResponse = z.object({
    url: z.string().trim().optional(),
    job_id: z.string().trim().optional(),
    timestamp: z.string().trim().optional(),
    message: z.string().trim().optional(),
});
export type SaveJobResponse = z.output<typeof SaveJobResponse>;
