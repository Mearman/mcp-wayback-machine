# MCP Wayback Machine Server

[![npm version](https://img.shields.io/npm/v/mcp-wayback-machine.svg)](https://www.npmjs.com/package/mcp-wayback-machine)
[![GitHub](https://img.shields.io/github/license/Mearman/mcp-wayback-machine)](https://github.com/Mearman/mcp-wayback-machine)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Mearman/mcp-wayback-machine/ci.yml?branch=main)](https://github.com/Mearman/mcp-wayback-machine/actions)

An MCP (Model Context Protocol) server and CLI tool for interacting with the Internet Archive's Wayback Machine without requiring API keys.

## Overview

This tool can be used in two ways:
1. **As an MCP server** - Integrate with Claude Desktop for AI-powered interactions
2. **As a CLI tool** - Use directly from the command line with `npx` or global installation

Features:
- Save web pages to the Wayback Machine
- Retrieve archived versions of web pages  
- Check archive status and statistics
- Search the Wayback Machine CDX API for available snapshots

## Features

- **No API keys required** - Uses public Wayback Machine endpoints
- **Save pages** - Archive any publicly accessible URL
- **Retrieve archives** - Get archived versions with optional timestamps
- **Archive statistics** - Get capture counts and yearly statistics
- **Search archives** - Query available snapshots with date filtering
- **Rate limiting** - Built-in rate limiting to respect service limits

## Tools

### 1. **save_url**
Archive a URL to the Wayback Machine.
- **Input**: `url` (required) - The URL to save
- **Output**: Success status, archived URL, and timestamp
- Handles rate limiting automatically

### 2. **get_archived_url**  
Retrieve an archived version of a URL.
- **Input**: 
  - `url` (required) - The URL to retrieve
  - `timestamp` (optional) - Specific timestamp (YYYYMMDDhhmmss) or "latest"
- **Output**: Archived URL, timestamp, and availability status

### 3. **search_archives**
Search for all archived versions of a URL.
- **Input**:
  - `url` (required) - The URL to search for
  - `from` (optional) - Start date (YYYY-MM-DD)
  - `to` (optional) - End date (YYYY-MM-DD)  
  - `limit` (optional) - Maximum results (default: 10)
- **Output**: List of snapshots with dates, URLs, status codes, and mime types

### 4. **check_archive_status**
Check archival statistics for a URL.
- **Input**: `url` (required) - The URL to check
- **Output**: Archive status, first/last capture dates, total captures, yearly statistics

### Technical Details

- **Transport**: Stdio (for Claude Desktop integration)
- **HTTP Client**: Built-in fetch with timeout support
- **Rate Limiting**: 15 requests per minute (conservative limit)
- **Error Handling**: Graceful handling with detailed error messages
- **Validation**: URL and timestamp validation
- **TypeScript**: Full type safety with Zod schema validation

### API Endpoints (No Keys Required)

- **Save Page Now**: `https://web.archive.org/save/{url}` - Archive pages on demand
  - [Documentation](https://docs.google.com/document/d/1Nsv52MvSjbLb2PCpHlat0gkzw0EvtSgpKHu4mk0MnrA/edit#heading=h.uu61fictja6r)
- **Availability API**: `http://archive.org/wayback/available?url={url}` - Check archive status
  - [Documentation](https://archive.org/help/wayback_api.php)
- **CDX Server API**: `http://web.archive.org/cdx/search/cdx?url={url}` - Advanced search and filtering
  - [Documentation](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server#readme)
- **TimeMap API**: `http://web.archive.org/web/timemap/link/{url}` - Get all timestamps for a URL
  - [Memento Protocol](http://timetravel.mementoweb.org/guide/api/)
- **Metadata API**: `https://archive.org/metadata/{identifier}` - Get Internet Archive item metadata
  - [Documentation](https://archive.org/developers/metadata-schema/index.html)
- **Search API**: `https://archive.org/advancedsearch.php?q={query}&output=json` - Search collections
  - [Documentation](https://archive.org/developers/advancedsearch.html)

### Project Structure

```
mcp-wayback-machine/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── tools/            # Tool implementations
│   │   ├── save.ts       # save_url tool
│   │   ├── retrieve.ts   # get_archived_url tool
│   │   ├── search.ts     # search_archives tool
│   │   └── status.ts     # check_archive_status tool
│   ├── utils/            # Utilities
│   │   ├── http.ts       # HTTP client with timeout
│   │   ├── validation.ts # URL/timestamp validation
│   │   └── rate-limit.ts # Rate limiting implementation
│   └── *.test.ts         # Test files (alongside source)
├── dist/                 # Built JavaScript files
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

### As a CLI Tool (Quick Start)

Use directly with npx (no installation needed):
```bash
npx mcp-wayback-machine save https://example.com
```

Or install globally:
```bash
npm install -g mcp-wayback-machine
wayback save https://example.com
```

### As an MCP Server

Install for use with Claude Desktop:
```bash
npm install -g mcp-wayback-machine
```

### From Source
```bash
git clone https://github.com/Mearman/mcp-wayback-machine.git
cd mcp-wayback-machine
yarn install
yarn build
```

## Usage

### CLI Usage

The tool provides a `wayback` command (or use `npx mcp-wayback-machine`):

#### Save a URL
```bash
wayback save https://example.com
# or
npx mcp-wayback-machine save https://example.com
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

#### Get help
```bash
wayback --help
wayback save --help
```

### Claude Desktop Configuration

Add to your Claude Desktop settings:

#### Using npm installation
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

#### Using local installation  
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

#### For development (without building)
```json
{
  "mcpServers": {
    "wayback-machine": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp-wayback-machine/src/index.ts"]
    }
  }
}
```

## Development

```bash
yarn dev       # Run in development mode with hot reload
yarn test      # Run tests  
yarn test:watch # Run tests in watch mode
yarn build     # Build for production
yarn start     # Run production build
```

### Testing
The project uses Vitest for testing. Tests are located alongside source files with `.test.ts` extensions.

## Resources

### Official Documentation
- [Wayback Machine APIs Overview](https://archive.org/developers/wayback-api.html)
- [Internet Archive API Documentation](https://archive.org/developers/)
- [CDX Server Documentation](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)
- [Save Page Now 2 (SPN2) API](https://docs.google.com/document/d/1Nsv52MvSjbLb2PCpHlat0gkzw0EvtSgpKHu4mk0MnrA/)
- [Memento Protocol Guide](http://timetravel.mementoweb.org/guide/api/)

### Rate Limits & Best Practices
- No hard rate limits for public APIs
- Be respectful - add delays between requests
- Use specific date ranges to reduce CDX result sets
- Cache responses when possible
- Include descriptive User-Agent header

## Authenticated APIs (Not Implemented)

For completeness, here are Internet Archive APIs that require authentication but are **not included** in this MCP server:

### S3-Compatible API (IAS3)
- **Authentication**: S3-style access keys from `https://archive.org/account/s3.php`
- **Features**: Upload files, modify metadata, create items, manage collections
- **Documentation**: 
  - [Internet Archive Python Library](https://archive.org/developers/internetarchive/)
  - [IAS3 API Documentation](https://archive.org/developers/ias3.html)
  - [Metadata Schema](https://archive.org/developers/metadata-schema/)

### Authenticated Search API
- **Authentication**: S3 credentials
- **Features**: Advanced search capabilities, higher rate limits
- **Access**: Requires Internet Archive account
- **Documentation**: 
  - [Advanced Search API](https://archive.org/developers/advancedsearch.html)
  - [Search API Examples](https://archive.org/developers/search.html)

### Save Page Now 2 (SPN2) - Enhanced Features
- **Authentication**: Partnership agreement typically required
- **Features**: Bulk captures, priority processing, higher rate limits
- **Documentation**: 
  - [SPN2 API Guide](https://docs.google.com/document/d/1Nsv52MvSjbLb2PCpHlat0gkzw0EvtSgpKHu4mk0MnrA/)
  - [Save Page Now Overview](https://help.archive.org/save-pages-in-the-wayback-machine/)

### Partner/Bulk Access APIs
- **Authentication**: Special partnership agreement
- **Features**: Bulk downloads, custom data exports, direct database access
- **Access**: Contact Internet Archive directly
- **Documentation**: 
  - [Researcher Services](https://archive.org/details/researcher-services)
  - [Bulk Access Information](https://archive.org/about/bulk-access/)

### Getting API Keys
1. Create account at [archive.org](https://archive.org)
2. Visit [S3 API page](https://archive.org/account/s3.php) (requires login)
3. Generate Access Key and Secret Key pair
4. Configure using `ia configure` command or manual configuration

**Note**: This MCP server focuses on public, keyless APIs to maintain simplicity and avoid credential management.

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

**You are free to**:
- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

**Under the following terms**:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made
- **NonCommercial** — You may not use the material for commercial purposes
- **ShareAlike** — If you remix, transform, or build upon the material, you must distribute your contributions under the same license

For commercial use or licensing inquiries, please contact the copyright holder.