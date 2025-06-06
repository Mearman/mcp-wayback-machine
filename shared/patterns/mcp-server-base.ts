/**
 * Base patterns and utilities for MCP server development
 * This provides common functionality that all MCP servers can use
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
  execute: (input: any) => Promise<any>;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
  tools: MCPTool[];
  enableCLI?: boolean;
  cliCommands?: Record<string, (args: any) => Promise<void>>;
}

/**
 * Base class for MCP servers with common functionality
 */
export class MCPServerBase {
  protected server: Server;
  protected config: MCPServerConfig;
  protected tools: Map<string, MCPTool> = new Map();

  constructor(config: MCPServerConfig) {
    this.config = config;
    
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register tools
    config.tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });

    this.setupHandlers();
  }

  /**
   * Set up MCP request handlers
   */
  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;
      
      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await tool.execute(args);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Add a tool to the server
   */
  addTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Remove a tool from the server
   */
  removeTool(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Check if running as CLI
    if (this.config.enableCLI && this.isRunningAsCLI()) {
      await this.runCLI();
      return;
    }

    // Start as MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  /**
   * Check if running as CLI (not as MCP server)
   */
  private isRunningAsCLI(): boolean {
    // Check for CLI-specific arguments or environment
    return process.argv.includes('--cli') || 
           process.argv.includes('cli') ||
           process.env.MCP_CLI_MODE === 'true';
  }

  /**
   * Run in CLI mode
   */
  private async runCLI(): Promise<void> {
    if (!this.config.cliCommands) {
      console.error('CLI mode enabled but no CLI commands defined');
      process.exit(1);
    }

    const command = process.argv[2];
    const cliHandler = this.config.cliCommands[command];

    if (!cliHandler) {
      console.error(`Unknown command: ${command}`);
      console.error('Available commands:', Object.keys(this.config.cliCommands).join(', '));
      process.exit(1);
    }

    try {
      await cliHandler(process.argv.slice(3));
    } catch (error) {
      console.error('CLI Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Create a tool with validation
   */
  static createTool(config: {
    name: string;
    description: string;
    inputSchema: object;
    execute: (input: any) => Promise<any>;
    validate?: (input: any) => boolean | string;
  }): MCPTool {
    return {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      execute: async (input: any) => {
        // Run validation if provided
        if (config.validate) {
          const validation = config.validate(input);
          if (validation !== true) {
            throw new Error(typeof validation === 'string' ? validation : 'Invalid input');
          }
        }

        return config.execute(input);
      },
    };
  }

  /**
   * Helper to create error responses
   */
  protected createErrorResponse(message: string): { content: Array<{ type: string; text: string }>; isError: boolean } {
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }

  /**
   * Helper to create success responses
   */
  protected createSuccessResponse(data: any): { content: Array<{ type: string; text: string }> } {
    return {
      content: [
        {
          type: 'text',
          text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
        },
      ],
    };
  }
}

/**
 * Utility function to create and start an MCP server
 */
export async function createMCPServer(config: MCPServerConfig): Promise<void> {
  const server = new MCPServerBase(config);
  await server.start();
}

/**
 * Decorator for tool methods (for class-based tool definitions)
 */
export function tool(name: string, description: string, inputSchema: object) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store tool metadata
    if (!target.constructor._tools) {
      target.constructor._tools = [];
    }
    
    target.constructor._tools.push({
      name,
      description,
      inputSchema,
      execute: descriptor.value,
    });
  };
}

/**
 * Helper to extract tools from a class decorated with @tool
 */
export function extractToolsFromClass(instance: any): MCPTool[] {
  const tools = instance.constructor._tools || [];
  return tools.map((tool: any) => ({
    ...tool,
    execute: tool.execute.bind(instance),
  }));
}