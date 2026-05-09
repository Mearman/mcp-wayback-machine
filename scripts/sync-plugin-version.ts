/**
 * Syncs the version from package.json into .claude-plugin/plugin.json.
 *
 * Run by semantic-release after @semantic-release/npm bumps package.json
 * in the prepare phase, before @semantic-release/git commits.
 */

import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const path = ".claude-plugin/plugin.json";
const manifest = JSON.parse(fs.readFileSync(path, "utf8"));

manifest.version = pkg.version;

fs.writeFileSync(path, JSON.stringify(manifest, null, 4) + "\n");
