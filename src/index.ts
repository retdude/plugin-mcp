import { type IAgentRuntime, type Plugin, logger } from "@elizaos/core";
import { callToolAction } from "./actions/callToolAction";
import { readResourceAction } from "./actions/readResourceAction";
import { provider } from "./provider";
import { McpService } from "./service";

const mcpPlugin: Plugin = {
  name: "@elizaos/plugin-mcp",
  description: "Plugin for connecting to MCP (Model Context Protocol) servers",
  services: [McpService],
  actions: [callToolAction, readResourceAction],
  providers: [provider]
};

export type { McpService };

export default mcpPlugin;
