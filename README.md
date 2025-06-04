# MCP Wayback Machine Server

An MCP (Model Context Protocol) server for interacting with the Internet Archive's Wayback Machine without requiring API keys.

## Overview

This MCP server provides tools to:
- Save web pages to the Wayback Machine
- Retrieve archived versions of web pages
- Check archive status and availability
- Search the Wayback Machine CDX API

## Features

- **No API keys required** - Uses public Wayback Machine endpoints
- **Save pages** - Archive any publicly accessible URL
- **Retrieve archives** - Get archived versions with timestamps
- **Verify archives** - Check if saves were successful
- **Search archives** - Query available snapshots for a URL

## Architecture Plan

### Core Tools

1. **save_url**
   - Triggers archiving of a URL
   - Returns the archive timestamp and URL
   - Handles rate limiting and retries

2. **get_archived_url**
   - Retrieves the most recent archived version
   - Option to specify a specific timestamp
   - Returns the wayback URL

3. **check_archive_status**
   - Verifies if an archive request completed
   - Returns status and final archive URL

4. **search_archives**
   - Query CDX API for available snapshots
   - Filter by date range
   - Return list of available versions

5. **get_archive_availability**
   - Check if a URL has been archived
   - Return summary of archive coverage

### Technical Implementation

- **Transport**: Stdio (for Claude Desktop integration)
- **HTTP Client**: Built-in fetch for API calls
- **Rate Limiting**: Respect Wayback Machine limits
- **Error Handling**: Graceful handling of failed saves
- **Validation**: URL validation before operations

### API Endpoints (No Keys Required)

- Save: `https://web.archive.org/save/{url}`
- Availability: `https://archive.org/wayback/available?url={url}`
- CDX Search: `https://web.archive.org/cdx/search/cdx?url={url}`

### Project Structure

```
mcp-wayback-machine/
├── src/
│   ├── index.ts          # Main server entry point
│   ├── tools/            # Tool implementations
│   │   ├── save.ts
│   │   ├── retrieve.ts
│   │   ├── search.ts
│   │   └── status.ts
│   ├── utils/            # Utilities
│   │   ├── http.ts       # HTTP client wrapper
│   │   ├── validation.ts # URL validation
│   │   └── rate-limit.ts # Rate limiting
│   └── types.ts          # TypeScript types
├── tests/                # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
npm install
npm run build
```

## Usage

Configure in Claude Desktop settings:

```json
{
  "mcpServers": {
    "wayback-machine": {
      "command": "node",
      "args": ["/path/to/mcp-wayback-machine/dist/index.js"]
    }
  }
}
```

## Development

```bash
npm run dev    # Run in development mode
npm test       # Run tests
npm run build  # Build for production
```

## License

MIT