# MCP TypeScript Server Template

A template repository for building Model Context Protocol (MCP) servers with TypeScript.

[![Use this template](https://img.shields.io/badge/Use%20this%20template-2ea44f?style=for-the-badge)](https://github.com/Mearman/mcp-template/generate)
[![GitHub](https://img.shields.io/github/stars/Mearman/mcp-template?style=for-the-badge)](https://github.com/Mearman/mcp-template)

## Features

- 🚀 Full TypeScript support with strict mode
- 🧪 Testing setup with Vitest and coverage reporting
- 📦 Automated releases with semantic-release
- 🔄 CI/CD pipelines with GitHub Actions
- 🏗️ Modular architecture for easy extension
- 📝 Comprehensive documentation and examples
- 🛠️ Development tools: Biome for linting/formatting, Husky for Git hooks
- 🎯 Pre-configured for MCP server development
- 🔐 Built-in validation using Zod schemas
- ⚡ ES modules with native Node.js support
- 📊 Code coverage reporting with c8

## MCP Servers Built with This Template

Here are some MCP servers built using this template:

### Wayback Machine MCP
[![GitHub](https://img.shields.io/github/stars/Mearman/mcp-wayback-machine?style=social)](https://github.com/Mearman/mcp-wayback-machine)
[![npm version](https://img.shields.io/npm/v/mcp-wayback-machine.svg)](https://www.npmjs.com/package/mcp-wayback-machine)
[![npm downloads](https://img.shields.io/npm/dm/mcp-wayback-machine.svg)](https://www.npmjs.com/package/mcp-wayback-machine)

Archive and retrieve web pages using the Internet Archive's Wayback Machine. No API keys required.

### OpenAlex MCP
[![GitHub](https://img.shields.io/github/stars/Mearman/mcp-openalex?style=social)](https://github.com/Mearman/mcp-openalex)
[![npm version](https://img.shields.io/npm/v/mcp-openalex.svg)](https://www.npmjs.com/package/mcp-openalex)
[![npm downloads](https://img.shields.io/npm/dm/mcp-openalex.svg)](https://www.npmjs.com/package/mcp-openalex)

Access scholarly articles and research data from the OpenAlex database.

---

*Building an MCP server? [Use this template](https://github.com/Mearman/mcp-template/generate) and add your server to this list!*

## Quick Start

### Using GitHub Template

1. Click "Use this template" button on GitHub
2. Clone your new repository
3. Install dependencies: `yarn install`
4. Start development: `yarn dev`

### Manual Setup

```bash
# Clone the template
git clone https://github.com/Mearman/mcp-template.git my-mcp-server
cd my-mcp-server

# Install dependencies
yarn install

# Start development
yarn dev
```

## Project Structure

```
src/
├── index.ts          # MCP server entry point
├── tools/            # Tool implementations
│   ├── example.ts    # Example tool
│   └── *.test.ts     # Tool tests
├── utils/            # Shared utilities
│   ├── validation.ts # Input validation helpers
│   └── *.test.ts     # Utility tests
└── types.ts          # TypeScript type definitions

# Configuration files
├── .github/workflows/  # CI/CD pipelines
├── .husky/            # Git hooks
├── biome.json         # Linter/formatter config
├── tsconfig.json      # TypeScript config
├── vitest.config.ts   # Test runner config
└── .releaserc.json    # Semantic release config
```

## Development

### Available Commands

```bash
# Install dependencies
yarn install

# Development with hot reload
yarn dev

# Build TypeScript to JavaScript
yarn build

# Run production build
yarn start

# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage report
yarn test:ci

# Lint code
yarn lint

# Auto-fix linting issues
yarn lint:fix

# Format code
yarn format
```

### Development Workflow

1. **Start development**: `yarn dev` - Runs the server with hot reload
2. **Write tests**: Add `.test.ts` files alongside your code
3. **Run tests**: `yarn test:watch` - Keep tests running while you code
4. **Lint/format**: Automatic on commit via Husky hooks

## Creating Your MCP Server

### 1. Define Your Tools

Create tool implementations in `src/tools/`:

```typescript
// src/tools/my-tool.ts
import { z } from 'zod';

const MyToolSchema = z.object({
  input: z.string().describe('Tool input'),
});

export async function myTool(args: unknown) {
  const { input } = MyToolSchema.parse(args);
  
  // Tool implementation
  return {
    success: true,
    result: `Processed: ${input}`,
  };
}
```

### 2. Register Tools in Server

Update `src/index.ts` to register your tools:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'my_tool',
      description: 'Description of what my tool does',
      inputSchema: zodToJsonSchema(MyToolSchema),
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'my_tool':
      return await myTool(request.params.arguments);
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});
```

### 3. Configure for Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["/path/to/my-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

## Testing

Write tests for your tools in `src/tools/*.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { myTool } from './my-tool';

describe('myTool', () => {
  it('should process input correctly', async () => {
    const result = await myTool({ input: 'test' });
    expect(result.success).toBe(true);
    expect(result.result).toBe('Processed: test');
  });
});
```

## Publishing

### NPM Package

1. Update `package.json` with your package details:
   - `name`: Your package name (e.g., `mcp-your-server`)
   - `description`: Clear description of what your server does
   - `keywords`: Add relevant keywords for discoverability
   - `author`: Your name or organization
   - `repository`: Your GitHub repository URL

2. Build the project:
   ```bash
   yarn build
   ```

3. Test the build locally:
   ```bash
   yarn start
   ```

4. Publish to npm:
   ```bash
   npm publish
   ```

### Automated Releases

This template includes semantic-release for automated versioning and publishing:

1. Follow [conventional commits](https://www.conventionalcommits.org/)
2. Push to main branch
3. CI/CD will automatically:
   - Determine version bump
   - Update CHANGELOG.md
   - Create GitHub release
   - Publish to npm (if NPM_TOKEN secret is configured)

**Note**: NPM publishing is optional. If you don't want to publish to npm, simply don't add the `NPM_TOKEN` secret to your repository. The release process will still create GitHub releases.

## Best Practices

1. **Input Validation**: Always validate tool inputs using Zod schemas
2. **Error Handling**: Provide clear error messages for debugging
3. **Testing**: Write comprehensive tests for all tools
4. **Documentation**: Document each tool's purpose and usage
5. **Type Safety**: Leverage TypeScript's type system fully
6. **Modular Design**: Keep tools focused on single responsibilities
7. **Async/Await**: Use modern async patterns for all I/O operations
8. **Environment Variables**: Use `.env` files for configuration (never commit secrets)

## Adding CLI Support

To add CLI functionality to your MCP server (like the Wayback Machine example):

1. Install Commander.js:
   ```bash
   yarn add commander chalk ora
   ```

2. Create `src/cli.ts`:
   ```typescript
   import { Command } from 'commander';
   import chalk from 'chalk';
   
   export function createCLI() {
     const program = new Command();
     
     program
       .name('your-tool')
       .description('Your MCP server as a CLI')
       .version('1.0.0');
       
     // Add commands here
     
     return program;
   }
   ```

3. Update `src/index.ts` to detect CLI mode:
   ```typescript
   async function main() {
     const isCliMode = process.stdin.isTTY || process.argv.length > 2;
     
     if (isCliMode && process.argv.length > 2) {
       const { createCLI } = await import('./cli.js');
       const program = createCLI();
       await program.parseAsync(process.argv);
     } else {
       // MCP server mode
       const transport = new StdioServerTransport();
       await server.connect(transport);
     }
   }
   ```

4. Add bin entry to `package.json`:
   ```json
   "bin": {
     "your-tool": "dist/index.js"
   }
   ```

## License

[![CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

## Maintaining Your MCP Server

### Template Updates

This template includes scripts to help you merge updates from the template into your derived MCP server:

1. **Merge Updates**: Use `scripts/merge-template-updates.sh` to selectively merge template improvements while preserving your customizations.

2. **Analyze Differences**: Use `scripts/analyze-template-diff.sh` to understand what has changed between your server and the template.

See `scripts/README.md` for detailed documentation on using these maintenance scripts.

### Installing Scripts in Existing Projects

If you created your MCP server before these scripts were added:

```bash
# From mcp-template directory
./scripts/install-scripts.sh ../path-to-your-mcp-server
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Troubleshooting

### Common Issues

1. **Build errors**: Ensure all dependencies are installed with `yarn install`
2. **Type errors**: Run `npx tsc --noEmit` to check TypeScript types
3. **Test failures**: Check test files are named `*.test.ts`
4. **Claude Desktop connection**: Verify the path in your config is absolute

### Debug Mode

To see detailed logs when running as an MCP server:

```bash
DEBUG=* node dist/index.js
```

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Creating MCP Servers Guide](https://modelcontextprotocol.io/tutorials/building-servers)
- [Awesome MCP Servers](https://github.com/modelcontextprotocol/awesome-mcp) - Community-curated list
- [MCP Discord](https://discord.gg/mcp) - Get help and share your servers