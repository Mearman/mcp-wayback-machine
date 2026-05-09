import { Command } from "commander";
import { getArchivedUrl } from "./tools/retrieve.ts";
import { saveUrl } from "./tools/save.ts";
import { searchArchives } from "./tools/search.ts";
import { checkArchiveStatus } from "./tools/status.ts";
import { listScreenshots } from "./tools/screenshots.ts";
import { compareSnapshots } from "./tools/compare.ts";
import { context } from "./contexts.ts";

export function createCLI() {
    const program = new Command();

    program
        .name("wayback")
        .description("CLI tool for interacting with the Wayback Machine")
        .version("1.0.0");

    // Save URL command
    program
        .command("save <url>")
        .description("Save a URL to the Wayback Machine")
        .action(async (url: string) => {
            try {
                console.log("Saving URL to Wayback Machine...");
                const result = await saveUrl({ url }, context);
                if (result.success) {
                    console.log("URL saved successfully!");
                    console.log("Archive URL:", result.archivedUrl);
                    if (result.timestamp) {
                        console.log("Timestamp:", result.timestamp);
                    }
                    if (result.jobId) {
                        console.log("Job ID:", result.jobId);
                    }
                } else {
                    console.error(result.message);
                }
            } catch (error) {
                console.error("Error saving URL");
                console.error(error);
            }
        });

    // Get archived URL command
    program
        .command("get <url>")
        .description("Get the archived version of a URL")
        .option(
            "-t, --timestamp <timestamp>",
            'Specific timestamp (YYYYMMDDHHMMSS) or "latest"'
        )
        .action(async (url: string, options: { timestamp?: string }) => {
            try {
                console.log("Retrieving archived URL...");
                const result = await getArchivedUrl(
                    { url, timestamp: options.timestamp },
                    context
                );
                if (result.success && result.available) {
                    console.log("Archive found!");
                    console.log("Archived URL:", result.archivedUrl);
                    console.log("Timestamp:", result.timestamp);
                    if (result.content) {
                        console.log("\nContent:");
                        console.log(result.content);
                    }
                } else {
                    console.log(result.message);
                }
            } catch (error) {
                console.error("Error retrieving archive");
                console.error(error);
            }
        });

    // Search archives command
    program
        .command("search <url>")
        .description("Search for all archived versions of a URL")
        .option("-f, --from <date>", "Start date (YYYY-MM-DD)")
        .option("-t, --to <date>", "End date (YYYY-MM-DD)")
        .option("-l, --limit <number>", "Maximum number of results", "10")
        .action(
            async (
                url: string,
                options: { from?: string; to?: string; limit: string }
            ) => {
                try {
                    console.log("Searching archives...");
                    const result = await searchArchives(
                        {
                            url,
                            from: options.from,
                            to: options.to,
                            limit: Number.parseInt(options.limit, 10),
                        },
                        context
                    );
                    if (
                        result.success &&
                        result.results &&
                        result.results.length > 0
                    ) {
                        console.log(
                            `Found ${String(result.totalResults)} archives`
                        );
                        console.log("\nArchive snapshots:");
                        for (const snapshot of result.results) {
                            console.log("─".repeat(60));
                            console.log("Date:", snapshot.date);
                            console.log("URL:", snapshot.archivedUrl);
                            console.log("Status:", snapshot.statusCode);
                            console.log("Type:", snapshot.mimeType);
                        }
                    } else {
                        console.log(result.message);
                    }
                } catch (error) {
                    console.error("Error searching archives");
                    console.error(error);
                }
            }
        );

    // Check status command
    program
        .command("status <url>")
        .description("Check the archive status of a URL")
        .action(async (url: string) => {
            try {
                console.log("Checking archive status...");
                const result = await checkArchiveStatus({ url }, context);
                if (result.success) {
                    if (result.isArchived) {
                        console.log("URL is archived!");
                        console.log("Total captures:", result.totalCaptures);
                        console.log("First capture:", result.firstCapture);
                        console.log("Last capture:", result.lastCapture);
                        if (result.yearlyCaptures) {
                            console.log("\nYearly captures:");
                            for (const [year, count] of Object.entries(
                                result.yearlyCaptures
                            )) {
                                console.log(`${year}:`, count);
                            }
                        }
                    } else {
                        console.log("URL has not been archived");
                    }
                } else {
                    console.error(result.message);
                }
            } catch (error) {
                console.error("Error checking status");
                console.error(error);
            }
        });

    // List screenshots command
    program
        .command("screenshots <url>")
        .description("List available screenshots for a URL")
        .option("-l, --limit <number>", "Maximum number of results", "10")
        .action(async (url: string, options: { limit: string }) => {
            try {
                console.log("Searching for screenshots...");
                const result = await listScreenshots(
                    {
                        url,
                        limit: Number.parseInt(options.limit, 10),
                    },
                    context
                );
                if (
                    result.success &&
                    result.screenshots &&
                    result.screenshots.length > 0
                ) {
                    console.log(
                        `Found ${String(result.totalScreenshots)} screenshot(s)`
                    );
                    for (const s of result.screenshots) {
                        console.log("─".repeat(60));
                        console.log("Date:", s.date);
                        console.log("Screenshot:", s.screenshotUrl);
                    }
                } else {
                    console.log(result.message);
                }
            } catch (error) {
                console.error("Error listing screenshots");
                console.error(error);
            }
        });

    // Compare snapshots command
    program
        .command("compare <url>")
        .description("Compare two archived snapshots of a URL")
        .option(
            "-a, --timestamp-a <timestamp>",
            "First timestamp (YYYYMMDDhhmmss)"
        )
        .option(
            "-b, --timestamp-b <timestamp>",
            "Second timestamp (YYYYMMDDhhmmss)"
        )
        .action(
            async (
                url: string,
                options: { timestampA?: string; timestampB?: string }
            ) => {
                try {
                    console.log("Comparing snapshots...");
                    const result = await compareSnapshots(
                        {
                            url,
                            timestampA: options.timestampA,
                            timestampB: options.timestampB,
                        },
                        context
                    );
                    if (result.success) {
                        if (result.snapshotA && result.snapshotB) {
                            console.log(
                                `Snapshot A: ${result.snapshotA.date} (${result.snapshotA.timestamp})`
                            );
                            console.log(
                                `Snapshot B: ${result.snapshotB.date} (${result.snapshotB.timestamp})`
                            );
                        }
                        if (result.changesUrl) {
                            console.log(`\nVisual diff: ${result.changesUrl}`);
                        }
                    } else {
                        console.error(result.message);
                    }
                } catch (error) {
                    console.error("Error comparing snapshots");
                    console.error(error);
                }
            }
        );

    return program;
}
