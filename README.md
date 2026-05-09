# MCP Wayback Machine Server

[![npm version](https://img.shields.io/npm/v/mcp-wayback-machine.svg)](https://www.npmjs.com/package/mcp-wayback-machine)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Mearman/mcp-wayback-machine/ci.yml?branch=main)](https://github.com/Mearman/mcp-wayback-machine/actions)

An MCP (Model Context Protocol) server and CLI tool for interacting with the Internet Archive's Wayback Machine. Supports full CDX search, snapshot content retrieval, screenshot listing, snapshot comparison, and optional authentication for higher SPN2 rate limits.

## Installation

### As an MCP server

#### CLI shorthand

Some agent harnesses provide a one-command install:

**Claude Code:**

```bash
claude mcp add wayback-machine -- npx -y mcp-wayback-machine
```

**OpenAI Codex:**

```bash
codex mcp add wayback-machine -- npx -y mcp-wayback-machine
```

To include optional credentials:

```bash
claude mcp add wayback-machine --env WAYBACK_ACCESS_KEY=xxx --env WAYBACK_SECRET_KEY=xxx -- npx -y mcp-wayback-machine
```

```bash
codex mcp add wayback-machine --env WAYBACK_ACCESS_KEY=xxx --env WAYBACK_SECRET_KEY=xxx -- npx -y mcp-wayback-machine
```

#### Manual configuration

For harnesses that use config files, add the following to the appropriate section:

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

The `env` block is optional — the server works anonymously without credentials. See [Credentials](#credentials) for details.

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

What to ask the agent:

```
Archive https://example.com to the Wayback Machine
```

```
Find all archived snapshots of https://example.com from 2023
```

```
What's the earliest archived version of https://example.com?
```

```
Compare the oldest and newest snapshots of https://example.com
```

```
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

## Credentials

The server works anonymously by default. Set Internet Archive S3 credentials for higher rate limits on save operations:

```bash
export WAYBACK_ACCESS_KEY="your-access-key"
export WAYBACK_SECRET_KEY="your-secret-key"
```

To obtain credentials, log in to [archive.org](https://archive.org) and visit your [S3 API keys](https://archive.org/account/s3.php) page.

## CLI Usage

```bash
wayback save https://example.com
```

```bash
wayback get https://example.com
```

```bash
wayback get https://example.com --timestamp 20231225120000
```

```bash
wayback search https://example.com --from 2023-01-01 --to 2023-12-31 --limit 20
```

```bash
wayback status https://example.com
```

```bash
wayback screenshots https://example.com
```

```bash
wayback compare https://example.com
```

```bash
wayback compare https://example.com --timestamp-a 20230101000000 --timestamp-b 20240101000000
```

## Technical Details

- **Transport**: stdio (MCP client integration)
- **Caching**: in-memory and disk-based with per-endpoint TTLs:
  - Snapshot content: 24 hours (immutable once captured)
  - Availability, CDX, sparkline: 1 hour (grows but never mutates)
  - Save operations: 30 minutes (idempotent per URL)
  - Save status polling: 30 seconds (changes during active jobs)
- **Rate limiting**: 15 requests per minute, with automatic Retry-After handling for 429 responses
- **Validation**: Zod schemas for all inputs and API responses
- **Node.js 22+** required

## Development

Requires [pnpm](https://pnpm.io) and Node.js 22+.

```bash
pnpm install
pnpm validate     # typecheck + lint + test + build
```

## Resources

- [Internet Archive Developer Portal](https://archive.org/developers/)
- [CDX Server Documentation](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)
- [Save Page Now 2 (SPN2) API](https://docs.google.com/document/d/1Nsv52MvSjbLb2PCpHlat0gkzw0EvtSgpKHu4mk0MnrA/)
- [Bots, LLMs, and Automated Access](https://archive.org/developers/bots.html)

## License

[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](http://creativecommons.org/licenses/by-nc-sa/4.0/).

[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)
