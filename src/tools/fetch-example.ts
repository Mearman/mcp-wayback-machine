/**
 * @fileoverview Example tool demonstrating configurable fetch pattern
 * @module tools/fetch-example
 */

import { z } from 'zod';
import { FetchBackend, configurableFetch, fetchJson } from '../utils/fetch.js';

/**
 * Input schema for the fetch example tool
 */
export const FetchExampleSchema = z.object({
	url: z.string().url().describe('URL to fetch data from'),
	backend: z
		.nativeEnum(FetchBackend)
		.optional()
		.describe('Fetch backend to use for this request'),
	no_cache: z.boolean().optional().default(false).describe('Bypass cache for this request'),
	user_agent: z.string().optional().describe('Custom User-Agent header for this request'),
});

/**
 * TypeScript type for the fetch example tool input
 */
export type FetchExampleInput = z.infer<typeof FetchExampleSchema>;

/**
 * Example tool that demonstrates configurable fetch patterns
 * @param args - Raw input arguments to be validated
 * @returns MCP tool response with fetch result and metadata
 *
 * @example
 * ```typescript
 * // Use default fetch backend
 * const result = await fetchExampleTool({
 *   url: "https://httpbin.org/json"
 * });
 *
 * // Use memory cache with custom user agent
 * const cachedResult = await fetchExampleTool({
 *   url: "https://httpbin.org/json",
 *   backend: "cache-memory",
 *   user_agent: "MCP-Template/1.0"
 * });
 *
 * // Bypass cache for fresh data
 * const freshResult = await fetchExampleTool({
 *   url: "https://httpbin.org/json",
 *   backend: "cache-disk",
 *   no_cache: true
 * });
 * ```
 */
export async function fetchExampleTool(args: unknown) {
	try {
		const input = FetchExampleSchema.parse(args);
		const startTime = Date.now();

		// Prepare request options
		// biome-ignore lint/suspicious/noExplicitAny: Dynamic options building
		const requestOptions: any = {
			backend: input.backend,
			noCache: input.no_cache,
		};

		// Add custom headers if specified
		if (input.user_agent) {
			requestOptions.headers = {
				'User-Agent': input.user_agent,
			};
		}

		// Fetch the data
		const response = await configurableFetch.fetch(input.url, requestOptions);
		const endTime = Date.now();
		const duration = endTime - startTime;

		// Try to parse as JSON, fall back to text
		let data: unknown;
		let contentType = 'text';

		try {
			const text = await response.text();
			data = JSON.parse(text);
			contentType = 'json';
		} catch {
			// Reset response and get as text
			const freshResponse = await configurableFetch.fetch(input.url, requestOptions);
			data = await freshResponse.text();
		}

		// Get current fetch configuration
		const config = configurableFetch.getConfig();

		return {
			content: [
				{
					type: 'text',
					text: `# Fetch Example Results

## Request Details
- **URL**: ${input.url}
- **Backend**: ${input.backend || config.backend}
- **Cache Bypassed**: ${input.no_cache ? 'Yes' : 'No'}
- **Custom User-Agent**: ${input.user_agent || 'None'}
- **Duration**: ${duration}ms

## Response Details
- **Status**: ${response.status} ${response.statusText}
- **Content-Type**: ${response.headers.get('content-type') || 'Unknown'}
- **Parsed As**: ${contentType}

## Response Data
\`\`\`${contentType}
${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
\`\`\`

## Current Fetch Configuration
- **Default Backend**: ${config.backend}
- **Cache TTL**: ${config.cacheTtl}ms
- **Cache Directory**: ${config.cacheDir}
- **Default User-Agent**: ${config.userAgent || 'Not set'}
`,
				},
			],
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `# Fetch Example Error

**Error**: ${error instanceof Error ? error.message : 'Unknown error'}

This error occurred while trying to fetch data using the configurable fetch pattern.
`,
				},
			],
			isError: true,
		};
	}
}

/**
 * Tool for configuring the global fetch instance
 */
export const ConfigureFetchSchema = z.object({
	backend: z.nativeEnum(FetchBackend).optional().describe('Default fetch backend to use'),
	cache_ttl: z.number().positive().optional().describe('Cache TTL in milliseconds'),
	cache_dir: z.string().optional().describe('Directory for disk caching'),
	user_agent: z.string().optional().describe('Default User-Agent header'),
	clear_cache: z.boolean().optional().default(false).describe('Clear all caches'),
});

/**
 * Tool for configuring the global fetch instance
 * @param args - Configuration parameters
 * @returns Configuration update result
 */
export async function configureFetchTool(args: unknown) {
	try {
		const input = ConfigureFetchSchema.parse(args);
		// Clear caches if requested
		if (input.clear_cache) {
			await configurableFetch.clearCaches();
		}

		// Update configuration (only include defined values)
		// biome-ignore lint/suspicious/noExplicitAny: Dynamic config building
		const updateConfig: any = {};
		if (input.backend !== undefined) updateConfig.backend = input.backend;
		if (input.cache_ttl !== undefined) updateConfig.cacheTtl = input.cache_ttl;
		if (input.cache_dir !== undefined) updateConfig.cacheDir = input.cache_dir;
		if (input.user_agent !== undefined) updateConfig.userAgent = input.user_agent;

		if (Object.keys(updateConfig).length > 0) {
			configurableFetch.updateConfig(updateConfig);
		}

		// Get updated configuration
		const config = configurableFetch.getConfig();
		const cacheStats = configurableFetch.getCacheStats();

		return {
			content: [
				{
					type: 'text',
					text: `# Fetch Configuration Updated

## Current Configuration
- **Backend**: ${config.backend}
- **Cache TTL**: ${config.cacheTtl || 0}ms (${Math.round((config.cacheTtl || 0) / 1000)}s)
- **Cache Directory**: ${config.cacheDir}
- **Max Cache Size**: ${Math.round((config.maxCacheSize || 0) / 1024 / 1024)}MB
- **User-Agent**: ${config.userAgent || 'Not set'}

## Cache Status
${input.clear_cache ? '✅ **Caches cleared**\n' : ''}
- **Memory Cache**: ${cacheStats.memory ? 'Enabled' : 'Disabled'}
- **Disk Cache**: ${cacheStats.disk ? 'Enabled' : 'Disabled'}

## Available Backends
- \`built-in\`: Use Node.js built-in fetch (no caching)
- \`cache-memory\`: Use in-memory caching (fast, but lost on restart)
- \`cache-disk\`: Use disk-based caching (persistent across restarts)
`,
				},
			],
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `# Configuration Error

**Error**: ${error instanceof Error ? error.message : 'Unknown error'}

Failed to update fetch configuration. Please check your input parameters.
`,
				},
			],
			isError: true,
		};
	}
}
