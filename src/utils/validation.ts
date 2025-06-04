import { type State } from "@elizaos/core";
import { type McpProviderData, type McpServerInfo, ResourceSelectionSchema } from "../types";
import { validateJsonSchema } from "./json";

export interface ToolSelection {
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
  reasoning?: string;
  noToolAvailable?: boolean;
}

export interface ResourceSelection {
  serverName: string;
  uri: string;
  reasoning?: string;
  noResourceAvailable?: boolean;
}

export function validateToolSelection(
  data: unknown,
  state: State
): { success: true; data: ToolSelection } | { success: false; error: string } {
  try {
    if (!data || typeof data !== "object") {
      return { success: false, error: "Invalid tool selection: data is not an object" };
    }

    const selection = data as ToolSelection;

    if (selection.noToolAvailable) {
      return { success: true, data: { noToolAvailable: true } as ToolSelection };
    }

    if (!selection.serverName || !selection.toolName) {
      return { success: false, error: "Invalid tool selection: missing serverName or toolName" };
    }

    const mcpData = state.values.mcp as McpProviderData;
    const server = mcpData[selection.serverName];

    if (!server) {
      return { success: false, error: `Server ${selection.serverName} not found` };
    }

    if (server.status !== "connected") {
      return { success: false, error: `Server ${selection.serverName} is not connected` };
    }

    // Case-insensitive tool lookup
    const tool = Object.entries(server.tools).find(
      ([name]) => name.toLowerCase() === selection.toolName.toLowerCase()
    );

    if (!tool) {
      return { success: false, error: `Tool ${selection.toolName} not found on server ${selection.serverName}` };
    }

    // Use the actual tool name from the server
    selection.toolName = tool[0];

    return { success: true, data: selection };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function validateResourceSelection(
  selection: unknown
): { success: true; data: ResourceSelection } | { success: false; error: string } {
  return validateJsonSchema<ResourceSelection>(selection, ResourceSelectionSchema);
}

export function createToolSelectionFeedbackPrompt(
  originalResponse: string,
  errorMessage: string,
  composedState: State,
  userMessage: string
): string {
  let toolsDescription = "";

  for (const [serverName, server] of Object.entries(composedState.values.mcp || {}) as [
    string,
    McpProviderData[string],
  ][]) {
    if (server.status !== "connected") continue;

    for (const [toolName, tool] of Object.entries(server.tools || {}) as [
      string,
      { description?: string },
    ][]) {
      toolsDescription += `Tool: ${toolName} (Server: ${serverName})\n`;
      toolsDescription += `Description: ${tool.description || "No description available"}\n\n`;
    }
  }

  return createFeedbackPrompt(
    originalResponse,
    errorMessage,
    "tool",
    toolsDescription,
    userMessage
  );
}

export function createResourceSelectionFeedbackPrompt(
  originalResponse: string,
  errorMessage: string,
  composedState: State,
  userMessage: string
): string {
  let resourcesDescription = "";

  for (const [serverName, server] of Object.entries(composedState.values.mcp || {}) as [
    string,
    McpProviderData[string],
  ][]) {
    if (server.status !== "connected") continue;

    for (const [uri, resource] of Object.entries(server.resources || {}) as [
      string,
      { description?: string; name?: string },
    ][]) {
      resourcesDescription += `Resource: ${uri} (Server: ${serverName})\n`;
      resourcesDescription += `Name: ${resource.name || "No name available"}\n`;
      resourcesDescription += `Description: ${
        resource.description || "No description available"
      }\n\n`;
    }
  }

  return createFeedbackPrompt(
    originalResponse,
    errorMessage,
    "resource",
    resourcesDescription,
    userMessage
  );
}

function createFeedbackPrompt(
  originalResponse: string,
  errorMessage: string,
  itemType: string,
  itemsDescription: string,
  userMessage: string
): string {
  return `Error parsing JSON: ${errorMessage}

Your original response:
${originalResponse}

Please try again with valid JSON for ${itemType} selection.
Available ${itemType}s:
${itemsDescription}

User request: ${userMessage}`;
}
