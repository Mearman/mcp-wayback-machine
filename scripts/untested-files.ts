/**
 * Check for source files that are not imported by any test —
 * the --all behaviour that Node's built-in coverage lacks.
 *
 * Reads the coverage report from stdin (via --test-coverage-include)
 * and cross-references with the filesystem to find uncovered files.
 *
 * Usage:
 *   node --experimental-strip-types scripts/untested-files.ts
 */

import { globSync } from "glob";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

// All source .ts files (excluding type declarations)
const allSourceFiles = globSync("src/**/*.ts", {
    cwd: projectRoot,
    ignore: [
        "src/**/*.d.ts",
        // Entry point — importing it starts the server/CLI
        "src/bin.ts",
        // Pure TypeScript interface — no runtime code to cover
        "src/tools/context.ts",
        // Worker files — depend on Cloudflare globals (caches) not available in Node
        "src/worker.ts",
        "src/utils/cache-cache-api.ts",
        "src/utils/rate-limit-cache-api.ts",
    ],
});

// Files reported by the built-in coverage are those that were loaded.
// We read them from the coverage output — but the built-in coverage
// doesn't output a machine-readable list. Instead, we run a test
// subprocess with NODE_V8_COVERAGE and parse the V8 JSON.
//
// Simpler approach: just import every source file and check which
// ones the test runner covered. The built-in coverage already tells
// us. So we parse the test output.
//
// Simplest approach: check which files appear in the --test-coverage
// output. But that's not available programmatically.
//
// Pragmatic approach: run a dummy import scan.

// Actually the simplest approach: the built-in coverage already
// reports per-file data in its terminal output. Files NOT listed
// are untested. We just need to find which files ARE listed.
//
// We'll do this by running the tests again with NODE_V8_COVERAGE
// and parsing the V8 coverage JSON to find loaded src/ files.

import { readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";

const covDir = mkdtempSync(join(tmpdir(), "cov-"));

// Run tests with V8 coverage
execSync(
    `node --experimental-strip-types --test 'tests/**/*.unit.test.ts' 'tests/**/*.integration.test.ts'`,
    {
        cwd: projectRoot,
        env: { ...process.env, NODE_V8_COVERAGE: covDir },
        stdio: "pipe",
    }
);

// Collect loaded file paths from V8 coverage
const loadedFiles = new Set<string>();
for (const file of readdirSync(covDir)) {
    if (!file.endsWith(".json")) continue;
    const data: V8Coverage = JSON.parse(
        readFileSync(join(covDir, file), "utf-8")
    );
    for (const entry of data.result) {
        if (!entry.url.includes("/src/")) continue;
        if (entry.url.includes("node_modules")) continue;
        const filePath = entry.url.startsWith("file://")
            ? decodeURI(entry.url.slice("file://".length))
            : entry.url;
        const relative = filePath.replace(projectRoot + "/", "");
        loadedFiles.add(relative);
    }
}

// Find untested files
const untested = allSourceFiles.filter((f) => !loadedFiles.has(f));

if (untested.length > 0) {
    console.error(
        `⚠ ${untested.length} source file(s) not covered by any test:`
    );
    for (const f of untested) {
        console.error(`   ${f}`);
    }
    console.error(
        "\nThese files are not loaded during the test run, so the built-in"
    );
    console.error(
        "coverage report does not include them. Add tests that import"
    );
    console.error("these files, or exclude them from the untested check.");
    process.exit(1);
} else {
    console.error("✅ All source files are covered by tests");
}

interface V8Coverage {
    result: Array<{
        url: string;
        functions: Array<{
            functionName: string;
            ranges: Array<{
                startOffset: number;
                endOffset: number;
                count: number;
            }>;
            isBlockCoverage: boolean;
        }>;
    }>;
}
