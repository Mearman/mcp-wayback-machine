# MCP Wayback Machine Server

[![npm version](https://img.shields.io/npm/v/mcp-wayback-machine.svg)](https://www.npmjs.com/package/mcp-wayback-machine)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Mearman/mcp-wayback-machine/ci.yml?branch=main)](https://github.com/Mearman/mcp-wayback-machine/actions)

> MCP server and CLI tool for interacting with the Internet Archive's Wayback Machine. Supports full CDX search, snapshot content retrieval, screenshot listing, snapshot comparison, and optional authentication for higher SPN2 rate limits.

**Stack:** TypeScript · Node.js 22+ · ES Modules · pnpm · Turbo · Zod

## Getting started

Requires Node.js 22+ and [pnpm](https://pnpm.io).

```bash
pnpm install
```

Optional credentials (anonymous access works, but authenticated requests get higher SPN2 rate limits):

```bash
export WAYBACK_ACCESS_KEY="your-access-key"
export WAYBACK_SECRET_KEY="your-secret-key"
```

Obtain credentials at [archive.org/account/s3.php](https://archive.org/account/s3.php).

## Build, test, and lint

```bash
pnpm validate          # typecheck + lint + build + test + untested-files check (the full CI gate)
pnpm check             # typecheck + lint + build only
pnpm build             # compile TypeScript to dist/
pnpm test              # run unit and integration tests
pnpm test:coverage     # run tests with coverage (80% line/branch/function threshold)
pnpm lint              # lint with ESLint
pnpm lint:fix          # auto-fix lint issues
```

To run a single test file:

```bash
node --test tests/tools/save.unit.test.ts
```

End-to-end tests hit the live Wayback Machine API and are opt-in:

```bash
pnpm test:e2e          # sets WAYBACK_LIVE_TESTS=1 internally via turbo
```

`pnpm validate` is the gate that must pass before a release. `prepublishOnly` runs it automatically.

## Architecture

`src/bin.ts` is the entry point. It detects whether it is invoked as a CLI or loaded as an MCP server and routes accordingly.

```
src/
  bin.ts          — entry point; dispatches to CLI or MCP server
  cli.ts          — Commander-based CLI implementation
  server.ts       — MCP server wiring (ListTools + CallTool handlers)
  contexts.ts     — shared context (rate limiter, cache, credentials)
  schemas.ts      — Zod schemas for all tool inputs; single source of truth
  tools/
    save.ts       — save_url tool (SPN2 API)
    retrieve.ts   — get_archived_url tool
    search.ts     — search_archives tool (CDX API)
    status.ts     — check_archive_status tool (sparkline API)
    screenshots.ts — list_screenshots tool
    compare.ts    — compare_snapshots tool
    cache.ts      — clear_cache tool
    context.ts    — injects shared context into tool handlers
  utils/
    http.ts       — fetch wrapper with rate limiting and Retry-After handling
    cache.ts      — in-memory + disk cache with per-endpoint TTLs
    rate-limit.ts — 15 req/min token bucket
    validation.ts — shared Zod validation helpers
```

Each tool module exports a schema (consumed by `ListToolsRequestSchema`) and an execution function (consumed by `CallToolRequestSchema`). New tools need both registrations in `server.ts`.

Caching TTLs are intentional — do not normalise them:

| Resource | TTL | Reason |
|---|---|---|
| Snapshot content | 24 h | Immutable once captured |
| Availability, CDX, sparkline | 1 h | Grows but never mutates |
| Save operations | 30 min | Idempotent per URL |
| Save status polling | 30 s | Changes during active jobs |

## Conventions

- **TypeScript strict mode** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` — no `any`, no `as` assertions.
- **ES Modules throughout** — `"type": "module"` in `package.json`. Always use `.ts` extensions in relative imports (rewritten to `.js` at build time via `rewriteRelativeImportExtensions`).
- **Zod is the single source of truth** for all tool input shapes. `schemas.ts` defines them; `zodToJsonSchema` derives the MCP-compatible JSON Schema.
- **Prettier** formats all TypeScript: 4-space indent, double quotes, trailing commas (`es5`), 80-char print width, LF line endings.
- **Conventional commits** are enforced by commitlint. Allowed scopes: `retrieve`, `save`, `search`, `status`, `fetch`, `http`, `validation`, `cli`, `build`, `release`, `ci`, `deps`. Commit messages must use British English.
- **Test colocation**: unit tests in `tests/tools/*.unit.test.ts` and `tests/utils/*.unit.test.ts`; integration tests in `tests/*.integration.test.ts`. Use the Node.js built-in test runner — no Jest or Vitest.
- **`erasableSyntaxOnly: true`** — no TypeScript syntax that cannot be stripped without transformation (no `enum`, no decorators, no `namespace`).

## Gotchas

- **`pnpm validate` before pushing.** CI runs `check + test + coverage + untested-files`. `pnpm validate` replicates this locally via Turbo.
- **Turbo caches aggressively.** If you change a config file that Turbo doesn't track as an input, cached task results may be stale. Clear with `pnpm turbo run <task> --force` if results look wrong.
- **`WAYBACK_LIVE_TESTS` must be set** to run `test:e2e`. The Turbo config passes it through via `globalPassThroughEnv`; don't set it in `.env` files — export it in your shell before running.
- **Coverage excludes** `src/contexts.ts`, `src/cli.ts`, `src/bin.ts`, and `src/tools/context.ts` — these are wiring/entry-point files. The 80% threshold applies to the remaining surface.
- **Rate limiting is 15 req/min** across all Wayback Machine API calls, with automatic Retry-After handling for 429 responses. Tests that mock HTTP must respect this — don't call real endpoints from unit tests.
- **`noUncheckedIndexedAccess`** means `Record<string, T>` lookups return `T | undefined`. Never fall back to `?? default` — narrow explicitly or restructure to a concrete type.
- **Node version** is pinned in `.tool-versions`. CI tests against Node 22, 24, and 26. Do not use Node APIs that aren't available in 22.

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are lint-checked by commitlint on PRs. PRs target `main`; CI must pass (`check`, `test`, `coverage`). Releases are fully automated via semantic-release on push to `main`.

After release, alias packages (`wayback-machine-mcp`, `mcp-internet-archive`, `internet-archive-mcp`, `@mearman/mcp-wayback-machine`) are published automatically by CI — do not publish these manually.

## Installation

### As an MCP server

#### CLI shorthand

**Claude Code (MCP):**

```bash
claude mcp add wayback-machine -- npx -y mcp-wayback-machine
```

**Claude Code (plugin marketplace):**

```bash
/plugin marketplace add https://github.com/Mearman/mcp-wayback-machine.git
/plugin install mcp-wayback-machine@mcp-wayback-machine
```

**OpenAI Codex:**

```bash
codex mcp add wayback-machine -- npx -y mcp-wayback-machine
```

To include optional credentials:

```bash
claude mcp add wayback-machine --env WAYBACK_ACCESS_KEY=xxx --env WAYBACK_SECRET_KEY=xxx -- npx -y mcp-wayback-machine
```

#### Manual configuration

Add to the appropriate config file:

```json
{
  "wayback-machine": {
    "command": "npx",
    "args": ["-y", "mcp-wayback-machine"],
    "env": {
      "WAYBACK_ACCESS_KEY": "your-access-key",
      "WAYBACK_SECRET_KEY": "your-secret-key"
    }
  }
}
```

| Harness | Config file | Config key |
|---|---|---|
| Claude Code | `.mcp.json` (project) / `~/.claude.json` (user) | `mcpServers` |
| Codex | `~/.codex/config.toml` | `[mcp_servers.wayback-machine]` |
| Gemini CLI | `~/.gemini/settings.json` | `mcpServers` |
| Crush | `.crush.json` / `~/.config/crush/crush.json` | `mcp` |
| Cline | `.cline/mcp.json` | `mcpServers` |
| Cursor | `.cursor/mcp.json` | `mcpServers` |
| Zed | `~/.config/zed/settings.json` | `context_servers` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | `mcpServers` |

The `env` block is optional — the server works anonymously without credentials.

### As a CLI tool

```bash
npx mcp-wayback-machine save https://example.com
```

Or install globally:

```bash
npm install -g mcp-wayback-machine
wayback save https://example.com
```

## Quick examples

```
Archive https://example.com to the Wayback Machine
Find all archived snapshots of https://example.com from 2023
What's the earliest archived version of https://example.com?
Compare the oldest and newest snapshots of https://example.com
Check how many times https://example.com has been archived
```

## Tools

### `save_url`

Archive a URL to the Wayback Machine using the SPN2 API.

<details>
<summary>Parameters</summary>

| Parameter | Required | Description |
|---|---|---|
| `url` | Yes | The URL to archive |
| `captureScreenshot` | No | Capture a screenshot as a PNG image |
| `captureOutlinks` | No | Also archive up to 100 outlinked pages |
| `ifNotArchivedWithin` | No | Skip if archived within timeframe, e.g. `"30d"` |
| `jsBehaviorTimeout` | No | Run JavaScript for N seconds before capturing (max 30) |
| `forceGet` | No | Use simple HTTP GET instead of browser rendering |
| `delayWbAvailability` | No | Delay indexing ~12 hours to reduce server load |

</details>

### `get_archived_url`

Retrieve an archived snapshot's content and metadata.

<details>
<summary>Parameters</summary>

| Parameter | Required | Description |
|---|---|---|
| `url` | Yes | The URL to retrieve |
| `timestamp` | No | Specific timestamp (`YYYYMMDDhhmmss`) or `"latest"` |
| `modifier` | No | URL modifier: `id_` (raw), `im_` (screenshot), `js_` (JS), `cs_` (CSS) |

</details>

### `search_archives`

Search the CDX API for archived versions of a URL.

<details>
<summary>Parameters</summary>

| Parameter | Required | Description |
|---|---|---|
| `url` | Yes | The URL pattern to search for |
| `matchType` | No | `exact`, `prefix`, `host`, or `domain` |
| `from` | No | Start date (`YYYYMMDD` or `YYYY-MM-DD`) |
| `to` | No | End date (`YYYYMMDD` or `YYYY-MM-DD`) |
| `limit` | No | Maximum results (default 10) |
| `offset` | No | Skip the first N results |
| `collapse` | No | Collapse duplicates, e.g. `"timestamp:8"` (per hour), `"digest"` |
| `filter` | No | Filter by field regex, e.g. `["statuscode:200", "!mimetype:image.*"]` |
| `resolveRevisits` | No | Resolve warc/revisit entries to original metadata |
| `showDupeCount` | No | Show duplicate count per capture |
| `page` | No | Page number for pagination |
| `pageSize` | No | Results per page |

</details>

### `check_archive_status`

Check archival statistics for a URL — capture counts, yearly breakdowns, and first/last capture dates.

<details>
<summary>Parameters</summary>

| Parameter | Required | Description |
|---|---|---|
| `url` | Yes | The URL to check |

</details>

### `list_screenshots`

List available screenshots for a URL.

<details>
<summary>Parameters</summary>

| Parameter | Required | Description |
|---|---|---|
| `url` | Yes | The URL to find screenshots for |
| `limit` | No | Maximum results (default 10) |

</details>

### `compare_snapshots`

Compare two archived snapshots of a URL. Fetches the raw content of both and provides a visual diff URL.

<details>
<summary>Parameters</summary>

| Parameter | Required | Description |
|---|---|---|
| `url` | Yes | The URL to compare snapshots for |
| `timestampA` | No | First timestamp. Defaults to oldest available. |
| `timestampB` | No | Second timestamp. Defaults to newest available. |

</details>

### `clear_cache`

Clear all cached API responses. Use when fresh data is needed or after saving a new URL.

## CLI usage

```bash
wayback save https://example.com
wayback get https://example.com
wayback get https://example.com --timestamp 20231225120000
wayback search https://example.com --from 2023-01-01 --to 2023-12-31 --limit 20
wayback status https://example.com
wayback screenshots https://example.com
wayback compare https://example.com
wayback compare https://example.com --timestamp-a 20230101000000 --timestamp-b 20240101000000
```

## References

- [Internet Archive Developer Portal](https://archive.org/developers/)
- [CDX Server Documentation](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)
- [Save Page Now 2 (SPN2) API](https://docs.google.com/document/d/1Nsv52MvSjbLb2PCpHlat0gkzw0EvtSgpKHu4mk0MnrA/)
- [Bots, LLMs, and Automated Access](https://archive.org/developers/bots.html)
- [internet-archive-skills](https://github.com/internetarchive/internet-archive-skills) — Official Claude Code skill for the `ia` Python CLI; complements this server.

## License

[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](http://creativecommons.org/licenses/by-nc-sa/4.0/).

[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)
