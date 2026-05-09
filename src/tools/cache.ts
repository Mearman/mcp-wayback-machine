/**
 * * Cache Management tool — clears the response cache.
 */
import * as z from "zod";
import { cachingFetcher } from "../utils/cache.ts";

export const ClearCache = z.object({});

export type ClearCache = z.output<typeof ClearCache>;

interface ClearCacheResult {
    success: boolean;
    message: string;
}

/**

 * * Clear all cached API responses.

 */
export async function clearCache(): Promise<ClearCacheResult> {
    try {
        await cachingFetcher.clear();
        return {
            success: true,
            message: "Cache cleared successfully",
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to clear cache: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}

/**

 * * Get cache status information.

 */
export function getCacheStatus(): {
    success: boolean;
    message: string;
    memoryEntries: number;
} {
    const stats = cachingFetcher.getStats();
    return {
        success: true,
        message: `Cache contains ${String(stats.memoryEntries)} in-memory entries`,
        memoryEntries: stats.memoryEntries,
    };
}
