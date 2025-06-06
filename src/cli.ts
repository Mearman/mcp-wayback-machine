/**
 * @fileoverview Command-line interface for MCP template operations
 * @module cli
 */

import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { exampleTool } from './tools/example.js';
import { configureFetchTool, fetchExampleTool } from './tools/fetch-example.js';

/**
 * Create and configure the CLI command structure
 * @returns Configured Commander program instance
 * @description Sets up CLI commands for MCP template operations. This provides
 * command-line access to the same tools available via the MCP server interface.
 * @example
 * ```typescript
 * const program = createCLI();
 * await program.parseAsync(process.argv);
 * ```
 */
export function createCLI() {
	const program = new Command();

	program
		.name('mcp-template')
		.description('CLI tool for MCP template operations')
		.version('1.0.0');

	// Example tool command
	program
		.command('example <message>')
		.description('Run the example tool that echoes back the input')
		.option('-u, --uppercase', 'Convert the message to uppercase')
		.action(async (message: string, options: { uppercase?: boolean }) => {
			const spinner = ora('Running example tool...').start();
			try {
				const result = await exampleTool({
					message,
					uppercase: options.uppercase || false,
				});

				spinner.succeed(chalk.green('Example tool completed!'));
				console.log(chalk.blue('Result:'), result.content[0].text);
			} catch (error) {
				spinner.fail(chalk.red('Error running example tool'));
				console.error(error);
				process.exit(1);
			}
		});

	// Fetch example tool command
	program
		.command('fetch-example <url>')
		.description('Demonstrate configurable fetch patterns with different backends and caching')
		.option(
			'-b, --backend <backend>',
			'Fetch backend to use (built-in, cache-memory, cache-disk)',
		)
		.option('--no-cache', 'Bypass cache for this request')
		.option('-u, --user-agent <agent>', 'Custom User-Agent header for this request')
		.action(
			async (
				url: string,
				options: { backend?: string; cache?: boolean; userAgent?: string },
			) => {
				const spinner = ora('Fetching data...').start();
				try {
					// biome-ignore lint/suspicious/noExplicitAny: Building args dynamically
					const args: any = { url };
					if (options.backend) args.backend = options.backend;
					if (options.cache === false) args.no_cache = true;
					if (options.userAgent) args.user_agent = options.userAgent;

					const result = await fetchExampleTool(args);

					if (result.isError) {
						spinner.fail(chalk.red('Error fetching data'));
						console.error(chalk.red(result.content[0].text));
						process.exit(1);
					} else {
						spinner.succeed(chalk.green('Fetch completed!'));
						console.log(result.content[0].text);
					}
				} catch (error) {
					spinner.fail(chalk.red('Error fetching data'));
					console.error(error);
					process.exit(1);
				}
			},
		);

	// Configure fetch tool command
	program
		.command('configure-fetch')
		.description('Configure the global fetch instance settings and caching behavior')
		.option('-b, --backend <backend>', 'Default fetch backend to use')
		.option('-t, --cache-ttl <ms>', 'Cache TTL in milliseconds', Number.parseInt)
		.option('-d, --cache-dir <dir>', 'Directory for disk caching')
		.option('-u, --user-agent <agent>', 'Default User-Agent header')
		.option('--clear-cache', 'Clear all caches')
		.action(
			async (options: {
				backend?: string;
				cacheTtl?: number;
				cacheDir?: string;
				userAgent?: string;
				clearCache?: boolean;
			}) => {
				const spinner = ora('Updating fetch configuration...').start();
				try {
					// biome-ignore lint/suspicious/noExplicitAny: Building args dynamically
					const args: any = {};
					if (options.backend) args.backend = options.backend;
					if (options.cacheTtl) args.cache_ttl = options.cacheTtl;
					if (options.cacheDir) args.cache_dir = options.cacheDir;
					if (options.userAgent) args.user_agent = options.userAgent;
					if (options.clearCache) args.clear_cache = true;

					const result = await configureFetchTool(args);

					if (result.isError) {
						spinner.fail(chalk.red('Error updating configuration'));
						console.error(chalk.red(result.content[0].text));
						process.exit(1);
					} else {
						spinner.succeed(chalk.green('Configuration updated!'));
						console.log(result.content[0].text);
					}
				} catch (error) {
					spinner.fail(chalk.red('Error updating configuration'));
					console.error(error);
					process.exit(1);
				}
			},
		);

	return program;
}
