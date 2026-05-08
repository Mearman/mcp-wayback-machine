# MCP Wayback Machine Server

[![npm version](https://img.shields.io/npm/v/mcp-wayback-machine.svg)](https://www.npmjs.com/package/mcp-wayback-machine)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Mearman/mcp-wayback-machine/ci.yml?branch=main)](https://github.com/Mearman/mcp-wayback-machine/actions)

An MCP (Model Context Protocol) server and CLI tool for interacting with the Internet Archive's Wayback Machine without requiring API keys.

## Overview

This tool can be used in two ways:
1. **As an MCP server** — integrate with Claude Desktop, LM Studio, or any MCP-compatible client
2. **As a CLI tool** — use directly from the command line with `npx` or global installation

Features:
- Save web pages to the Wayback Machine
- Retrieve archived versions of web pages
- Check archive status and statistics
- Search the Wayback Machine CDX API for available snapshots
- In-memory and disk-based request caching for read operations

## Tools

### `save_url`

Archive a URL to the Wayback Machine.

- **Input**: `url` (required) — the URL to save
- **Output**: success status, archived URL, and timestamp

### `get_archived_url`

Retrieve an archived version of a URL.

- **Input**:
  - `url` (required) — the URL to retrieve
  - `timestamp` (optional) — specific timestamp (`YYYYMMDDhhmmss`) or `"latest"`
- **Output**: archived URL, timestamp, and availability status

### `search_archives`

Search for all archived versions of a URL.

- **Input**:
  - `url` (required) — the URL to search for
  - `from` (optional) — start date (`YYYY-MM-DD`)
  - `to` (optional) — end date (`YYYY-MM-DD`)
  - `limit` (optional) — maximum results (default: 10)
- **Output**: list of snapshots with dates, URLs, status codes, and MIME types

### `check_archive_status`

Check archival statistics for a URL.

- **Input**: `url` (required) — the URL to check
- **Output**: archive status, first/last capture dates, total captures, yearly statistics

## Installation

### As a CLI tool (quick start)

```bash
npx mcp-wayback-machine save https://example.com
```

Or install globally:

```bash
npm install -g mcp-wayback-machine
wayback save https://example.com
```

### As an MCP server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "wayback-machine": {
      "command": "npx",
      "args": ["mcp-wayback-machine"]
    }
  }
}
```

For a local installation:

```json
{
  "mcpServers": {
    "wayback-machine": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-wayback-machine/dist/index.js"]
    }
  }
}
```

### From source

```bash
git clone https://github.com/Mearman/mcp-wayback-machine.git
cd mcp-wayback-machine
pnpm install
pnpm build
```

## CLI Usage

#### Save a URL

```bash
wayback save https://example.com
```

#### Get an archived version

```bash
wayback get https://example.com
wayback get https://example.com --timestamp 20231225120000
wayback get https://example.com --timestamp latest
```

#### Search archives

```bash
wayback search https://example.com
wayback search https://example.com --limit 20
wayback search https://example.com --from 2023-01-01 --to 2023-12-31
```

#### Check archive status

```bash
wayback status https://example.com
```

## Technical Details

- **Transport**: stdio (for MCP client integration)
- **HTTP client**: native `fetch` with timeout support
- **Caching**: in-memory and disk-based caching for read operations (retrieve, search, status); write operations (save) bypass the cache. Cache entries have a 5-minute TTL by default.
- **Rate limiting**: 15 requests per minute (conservative limit)
- **Validation**: Zod 4 schemas for all inputs and API responses
- **Node.js**: requires Node.js 22 or later

### API Endpoints (no keys required)

- **Save Page Now**: `https://web.archive.org/save/{url}` — archive pages on demand
- **Availability API**: `https://archive.org/wayback/available?url={url}` — check archive status
- **CDX Server API**: `https://web.archive.org/cdx/search/cdx?url={url}` — advanced search and filtering
- **Sparkline API**: `https://web.archive.org/__wb/sparkline?url={url}` — capture statistics

### Project structure

```
mcp-wayback-machine/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── cli.ts            # CLI interface (commander)
│   ├── tools/
│   │   ├── save.ts       # save_url tool
│   │   ├── retrieve.ts   # get_archived_url tool
│   │   ├── search.ts     # search_archives tool
│   │   └── status.ts     # check_archive_status tool
│   └── utils/
│       ├── cache.ts      # In-memory and disk caching
│       ├── http.ts       # HTTP client with timeout
│       ├── rate-limit.ts # Rate limiting
│       └── validation.ts # URL and timestamp validation
├── tests/                # Test files (node:test)
├── dist/                 # Built JavaScript
└── package.json
```

## Development

```bash
pnpm dev          # Run in development mode with hot reload
pnpm test         # Run tests
pnpm test:coverage # Run tests with coverage (80% threshold enforced)
pnpm build        # Build for production
pnpm lint         # Lint source and config files
pnpm typecheck    # Type-check without emitting
pnpm validate     # Run all checks (typecheck, lint, test, build)
```

## Resources

- [Wayback Machine APIs Overview](https://archive.org/developers/wayback-api.html)
- [Internet Archive API Documentation](https://archive.org/developers/)
- [CDX Server Documentation](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)
- [Save Page Now 2 (SPN2) API](https://docs.google.com/document/d/1Nsv52MvSjbLb2PCpHlat0gkzw0EvtSgpKHu4mk0MnrA/)
- [Memento Protocol Guide](http://timetravel.mementoweb.org/guide/api/)

## License

[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)
