import { type State } from "@elizaos/core";
import { type McpProvider, type McpProviderData, type McpServerInfo } from "../types";

export function createToolSelectionPrompt(state: State, mcpProvider: McpProvider): string {
  const mcpData = mcpProvider.data.mcp;
  const serverSummaries = Object.entries(mcpData)
    .map(([name, info]) => {
      const serverInfo = info as McpServerInfo;
      const toolList = Object.entries(serverInfo.tools)
        .map(([toolName, toolInfo]) => `- ${toolName}: ${toolInfo.description}`)
        .join("\n");
      return `Server: ${name}\nTools:\n${toolList}`;
    })
    .join("\n\n");

  return `You are an AI assistant that helps users interact with various tools and resources. Your task is to select the most appropriate tool or resource based on the user's request.

Available servers and their tools:
${serverSummaries}

User request: ${state.values.userMessage}

Instructions:
1. Analyze the user's request and determine if any of the available tools can help.
2. If a tool can help, select it by providing:
   - serverName: The name of the server that provides the tool
   - toolName: The name of the tool (case-insensitive, will be matched to the actual tool name)
   - arguments: Any required arguments for the tool
   - reasoning: A brief explanation of why you chose this tool
3. If no tool can help, set noToolAvailable to true.

Note: Tool names are case-insensitive - you can use any case (e.g., "maps_reverse_geocode" or "MAPS_REVERSE_GEOCODE"), and the system will match it to the correct tool.

Respond with a JSON object following this schema:
{
  "serverName": "string",
  "toolName": "string",
  "arguments": {},
  "reasoning": "string",
  "noToolAvailable": boolean
}`;
} 