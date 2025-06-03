import { type Plugin, type IAgentRuntime } from "@elizaos/core";
import { McpService } from "./service";

const mcpPlugin: Plugin = {
  name: "@elizaos/plugin-mcp",
  description: "Plugin for connecting to MCP (Model Context Protocol) servers",
  services: [McpService],
  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    const service = new McpService(runtime);
    await service.initialize(runtime);
  }
};

export default mcpPlugin;