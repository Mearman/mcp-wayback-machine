import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { getArchivedUrl } from './tools/retrieve.js';
import { saveUrl } from './tools/save.js';
import { searchArchives } from './tools/search.js';
import { checkArchiveStatus } from './tools/status.js';

export function createCLI() {
	const program = new Command();

	program
		.name('wayback')
		.description('CLI tool for interacting with the Wayback Machine')
		.version('1.0.0');

	// Save URL command
	program
		.command('save <url>')
		.description('Save a URL to the Wayback Machine')
		.action(async (url: string) => {
			const spinner = ora('Saving URL to Wayback Machine...').start();
			try {
				const result = await saveUrl({ url });
				if (result.success) {
					spinner.succeed(chalk.green('URL saved successfully!'));
					console.log(chalk.blue('Archive URL:'), result.archivedUrl);
					if (result.timestamp) {
						console.log(chalk.blue('Timestamp:'), result.timestamp);
					}
					if (result.jobId) {
						console.log(chalk.blue('Job ID:'), result.jobId);
					}
				} else {
					spinner.fail(chalk.red(result.message));
				}
			} catch (error) {
				spinner.fail(chalk.red('Error saving URL'));
				console.error(error);
			}
		});

	// Get archived URL command
	program
		.command('get <url>')
		.description('Get the archived version of a URL')
		.option('-t, --timestamp <timestamp>', 'Specific timestamp (YYYYMMDDHHMMSS) or "latest"')
		.action(async (url: string, options: { timestamp?: string }) => {
			const spinner = ora('Retrieving archived URL...').start();
			try {
				const result = await getArchivedUrl({ url, timestamp: options.timestamp });
				if (result.success && result.available) {
					spinner.succeed(chalk.green('Archive found!'));
					console.log(chalk.blue('Archived URL:'), result.archivedUrl);
					console.log(chalk.blue('Timestamp:'), result.timestamp);
				} else {
					spinner.fail(chalk.yellow(result.message || 'No archive found'));
				}
			} catch (error) {
				spinner.fail(chalk.red('Error retrieving archive'));
				console.error(error);
			}
		});

	// Search archives command
	program
		.command('search <url>')
		.description('Search for all archived versions of a URL')
		.option('-f, --from <date>', 'Start date (YYYY-MM-DD)')
		.option('-t, --to <date>', 'End date (YYYY-MM-DD)')
		.option('-l, --limit <number>', 'Maximum number of results', '10')
		.action(async (url: string, options: { from?: string; to?: string; limit: string }) => {
			const spinner = ora('Searching archives...').start();
			try {
				const result = await searchArchives({
					url,
					from: options.from,
					to: options.to,
					limit: Number.parseInt(options.limit, 10),
				});
				if (result.success && result.results && result.results.length > 0) {
					spinner.succeed(chalk.green(`Found ${result.totalResults} archives`));
					console.log(`\n${chalk.bold('Archive snapshots:')}`);
					result.results.forEach((snapshot) => {
						console.log(chalk.gray('─'.repeat(60)));
						console.log(chalk.blue('Date:'), snapshot.date);
						console.log(chalk.blue('URL:'), snapshot.archivedUrl);
						console.log(chalk.blue('Status:'), snapshot.statusCode);
						console.log(chalk.blue('Type:'), snapshot.mimeType);
					});
				} else {
					spinner.fail(chalk.yellow(result.message || 'No archives found'));
				}
			} catch (error) {
				spinner.fail(chalk.red('Error searching archives'));
				console.error(error);
			}
		});

	// Check status command
	program
		.command('status <url>')
		.description('Check the archive status of a URL')
		.action(async (url: string) => {
			const spinner = ora('Checking archive status...').start();
			try {
				const result = await checkArchiveStatus({ url });
				if (result.success) {
					if (result.isArchived) {
						spinner.succeed(chalk.green('URL is archived!'));
						console.log(chalk.blue('Total captures:'), result.totalCaptures);
						console.log(chalk.blue('First capture:'), result.firstCapture);
						console.log(chalk.blue('Last capture:'), result.lastCapture);
						if (result.yearlyCaptures) {
							console.log(`\n${chalk.bold('Yearly captures:')}`);
							Object.entries(result.yearlyCaptures).forEach(([year, count]) => {
								console.log(chalk.blue(`${year}:`), count);
							});
						}
					} else {
						spinner.warn(chalk.yellow('URL has not been archived'));
					}
				} else {
					spinner.fail(chalk.red(result.message || 'Error checking status'));
				}
			} catch (error) {
				spinner.fail(chalk.red('Error checking status'));
				console.error(error);
			}
		});

	return program;
}
