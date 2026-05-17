/**
 * Search Archives tool — Searches the Wayback Machine CDX API.
 * Supports match types, collapsing, filtering, pagination, and duplicate counting.
 */

import * as z from "zod";
import { CdxResponse } from "../schemas.ts";
import { HttpError } from "../utils/http.ts";
import { HttpUrl, formatTimestamp } from "../utils/validation.ts";
import type { ToolContext } from "./context.ts";

export const SearchArchives = z.object({
    url: HttpUrl.meta({ description: "The URL pattern to search for" }),
    matchType: z.enum(["exact", "prefix", "host", "domain"]).optional().meta({
        description:
            "URL match scope: exact (default), prefix (all under path), host, or domain (with subdomains)",
    }),
    from: z
        .string()
        .trim()
        .optional()
        .meta({ description: "Start date (YYYYMMDD or YYYY-MM-DD)" }),
    to: z
        .string()
        .trim()
        .optional()
        .meta({ description: "End date (YYYYMMDD or YYYY-MM-DD)" }),
    limit: z
        .int()
        .min(1)
        .default(10)
        .meta({ description: "Maximum number of results" }),
    offset: z
        .int()
        .min(0)
        .optional()
        .meta({ description: "Skip the first N results" }),
    collapse: z.string().trim().optional().meta({
        description:
            'Collapse adjacent duplicates by field, e.g. "timestamp:8" (per hour), "digest" (unique content)',
    }),
    filter: z.array(z.string().trim()).optional().meta({
        description:
            'Filter by field regex, e.g. ["statuscode:200", "!mimetype:image.*"]. Prefix with ! to negate.',
    }),
    resolveRevisits: z.boolean().optional().meta({
        description:
            "Resolve warc/revisit entries to their original mimetype and status code",
    }),
    showDupeCount: z.boolean().optional().meta({
        description: "Show duplicate count per capture (grouped by digest)",
    }),
    page: z
        .int()
        .min(0)
        .optional()
        .meta({ description: "Page number for pagination" }),
    pageSize: z
        .int()
        .min(1)
        .optional()
        .meta({ description: "Results per page" }),
});

export type SearchArchives = z.input<typeof SearchArchives>;

interface ArchiveResult {
    url: string;
    archivedUrl: string;
    timestamp: string;
    date: string;
    statusCode: string;
    mimeType: string;
    digest?: string;
    duplicateCount?: number;
}

interface SearchResult {
    success: boolean;
    message: string;
    totalResults: number;
    results?: ArchiveResult[];
    resumeKey?: string;
}

/**

 * * Search for archived versions of a URL using the CDX API.

 */
export async function searchArchives(
    input: SearchArchives,
    ctx: ToolContext
): Promise<SearchResult> {
    const {
        url,
        matchType,
        from,
        to,
        limit,
        offset,
        collapse,
        filter,
        resolveRevisits,
        showDupeCount,
        page,
        pageSize,
    } = input;

    try {
        const cdxUrl = new URL("https://web.archive.org/cdx/search/cdx");
        cdxUrl.searchParams.set("url", url);
        cdxUrl.searchParams.set("output", "json");
        cdxUrl.searchParams.set("limit", String(limit));

        if (matchType !== undefined) {
            cdxUrl.searchParams.set("matchType", matchType);
        }
        if (from !== undefined) {
            cdxUrl.searchParams.set("from", from.replace(/-/g, ""));
        }
        if (to !== undefined) {
            cdxUrl.searchParams.set("to", to.replace(/-/g, ""));
        }
        if (offset !== undefined) {
            cdxUrl.searchParams.set("offset", String(offset));
        }
        if (collapse !== undefined) {
            cdxUrl.searchParams.set("collapse", collapse);
        }
        if (resolveRevisits === true) {
            cdxUrl.searchParams.set("resolveRevisits", "true");
        }
        if (showDupeCount === true) {
            cdxUrl.searchParams.set("showDupeCount", "true");
        }
        if (page !== undefined) {
            cdxUrl.searchParams.set("page", String(page));
        }
        if (pageSize !== undefined) {
            cdxUrl.searchParams.set("pageSize", String(pageSize));
        }

        // Add filters
        if (filter !== undefined) {
            for (const f of filter) {
                cdxUrl.searchParams.append("filter", f);
            }
        }

        const data = await ctx.fetchJSON(cdxUrl.toString(), CdxResponse);

        // First row is headers
        if (data.length <= 1) {
            return {
                success: true,
                message: `No archived versions found for ${url}`,
                totalResults: 0,
                results: [],
            };
        }

        const headers = data[0];
        if (headers === undefined) {
            return {
                success: true,
                message: `No archived versions found for ${url}`,
                totalResults: 0,
                results: [],
            };
        }
        const colIdx = new Map(headers.map((h, i) => [h, i]));

        const results: ArchiveResult[] = data
            .slice(1)
            .filter((row) => row[colIdx.get("timestamp") ?? 1] !== undefined)
            .map((row) => {
                const ts = row[colIdx.get("timestamp") ?? 1] ?? "";
                const result: ArchiveResult = {
                    url: url,
                    archivedUrl: `https://web.archive.org/web/${ts}/${url}`,
                    timestamp: ts,
                    date: formatTimestamp(ts),
                    statusCode: row[colIdx.get("statuscode") ?? 4] ?? "",
                    mimeType: row[colIdx.get("mimetype") ?? 3] ?? "",
                };

                const digestIdx = colIdx.get("digest");
                if (digestIdx !== undefined) {
                    const val = row[digestIdx];
                    if (val !== undefined) {
                        result.digest = val;
                    }
                }

                const dupeIdx = colIdx.get("dupecount");
                if (dupeIdx !== undefined) {
                    const val = row[dupeIdx];
                    if (val !== undefined) {
                        const num = Number(val);
                        if (!Number.isNaN(num)) {
                            result.duplicateCount = num;
                        }
                    }
                }

                return result;
            });

        return {
            success: true,
            message: `Found ${String(results.length)} archived versions of ${url}`,
            totalResults: results.length,
            results,
        };
    } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
            return {
                success: true,
                message: `No archived versions found for ${url}`,
                totalResults: 0,
                results: [],
            };
        }

        if (error instanceof HttpError) {
            return {
                success: false,
                message: `Failed to search archives: ${error.message}`,
                totalResults: 0,
            };
        }

        return {
            success: false,
            message: `Failed to search archives: ${error instanceof Error ? error.message : "Unknown error"}`,
            totalResults: 0,
        };
    }
}
