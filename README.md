# MCP Wayback Machine Server

[![npm version](https://img.shields.io/npm/v/mcp-wayback-machine.svg)](https://www.npmjs.com/package/mcp-wayback-machine)
[![GitHub](https://img.shields.io/github/license/Mearman/mcp-wayback-machine)](https://github.com/Mearman/mcp-wayback-machine)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Mearman/mcp-wayback-machine/ci.yml?branch=main)](https://github.com/Mearman/mcp-wayback-machine/actions)

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
   - Filter by date range, status code, mimetype
   - Support different match types (exact, prefix, host, domain)
   - Return list of available versions with metadata

5. **get_archive_availability**
   - Check if a URL has been archived
   - Return closest snapshot to a given timestamp
   - Return summary of archive coverage

6. **get_timemap**
   - Retrieve TimeMap for a URL (all available timestamps)
   - Returns list of all archived versions
   - Implements Memento Protocol

7. **search_internet_archive**
   - Search across Internet Archive collections
   - Not limited to Wayback Machine
   - Find related archived content

### Technical Implementation

- **Transport**: Stdio (for Claude Desktop integration)
- **HTTP Client**: Built-in fetch for API calls
- **Rate Limiting**: Respect Wayback Machine limits
- **Error Handling**: Graceful handling of failed saves
- **Validation**: URL validation before operations

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