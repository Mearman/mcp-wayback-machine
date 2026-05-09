import type { GlobalConfig } from "semantic-release";

const config: GlobalConfig = {
    branches: [{ name: "main", channel: "latest" }],
    plugins: [
        [
            "@semantic-release/commit-analyzer",
            {
                preset: "conventionalcommits",
                releaseRules: [
                    { type: "feat", release: "minor" },
                    { type: "fix", release: "patch" },
                    { type: "refactor", release: "patch" },
                    { type: "perf", release: "patch" },
                    { type: "docs", release: "patch" },
                    { type: "style", release: "patch" },
                    { type: "test", release: "patch" },
                    { type: "build", release: "patch" },
                    { type: "ci", release: "patch" },
                    { type: "chore", release: "patch" },
                    { breaking: true, release: "major" },
                ],
            },
        ],
        [
            "@semantic-release/release-notes-generator",
            {
                preset: "conventionalcommits",
                presetConfig: {
                    types: [
                        { type: "feat", section: "Features" },
                        { type: "fix", section: "Bug Fixes" },
                        { type: "refactor", section: "Refactoring" },
                        { type: "perf", section: "Performance" },
                        { type: "docs", section: "Documentation" },
                        { type: "style", section: "Styles" },
                        { type: "test", section: "Tests" },
                        { type: "build", section: "Build" },
                        { type: "ci", section: "CI" },
                        { type: "chore", section: "Chores" },
                    ],
                },
            },
        ],
        "@semantic-release/changelog",
        "@semantic-release/npm",
        [
            "@semantic-release/git",
            {
                assets: ["package.json", "pnpm-lock.yaml", "CHANGELOG.md"],
                message:
                    "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}",
            },
        ],
        "@semantic-release/github",
    ],
};

export default config;
