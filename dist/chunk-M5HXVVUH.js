import {
  ResourceSelectionSchema,
  ToolSelectionSchema
} from "./chunk-OX6R62CA.js";
import {
  validateJsonSchema
} from "./chunk-NIQ7OFFJ.js";

// src/utils/validation.ts
function validateToolSelection(selection, composedState) {
  const basicResult = validateJsonSchema(selection, ToolSelectionSchema);
  if (!basicResult.success) {
    return { success: false, error: basicResult.error };
  }
  const data = basicResult.data;
  if (data.noToolAvailable) {
    return { success: true, data };
  }
  const mcpData = composedState.values.mcp || {};
  const serverInfo = mcpData[data.serverName];
  if (!serverInfo || serverInfo.status !== "connected") {
    return {
      success: false,
      error: `Server '${data.serverName}' not found or not connected`
    };
  }
  const toolInfo = serverInfo.tools?.[data.toolName];
  if (!toolInfo) {
    return {
      success: false,
      error: `Tool '${data.toolName}' not found on server '${data.serverName}'`
    };
  }
  if (toolInfo.inputSchema) {
    const validationResult = validateJsonSchema(
      data.arguments,
      toolInfo.inputSchema
    );
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid arguments: ${validationResult.error}`
      };
    }
  }
  return { success: true, data };
}
function validateResourceSelection(selection) {
  return validateJsonSchema(selection, ResourceSelectionSchema);
}
function createToolSelectionFeedbackPrompt(originalResponse, errorMessage, composedState, userMessage) {
  let toolsDescription = "";
  for (const [serverName, server] of Object.entries(composedState.values.mcp || {})) {
    if (server.status !== "connected") continue;
    for (const [toolName, tool] of Object.entries(server.tools || {})) {
      toolsDescription += `Tool: ${toolName} (Server: ${serverName})
`;
      toolsDescription += `Description: ${tool.description || "No description available"}

`;
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
function createResourceSelectionFeedbackPrompt(originalResponse, errorMessage, composedState, userMessage) {
  let resourcesDescription = "";
  for (const [serverName, server] of Object.entries(composedState.values.mcp || {})) {
    if (server.status !== "connected") continue;
    for (const [uri, resource] of Object.entries(server.resources || {})) {
      resourcesDescription += `Resource: ${uri} (Server: ${serverName})
`;
      resourcesDescription += `Name: ${resource.name || "No name available"}
`;
      resourcesDescription += `Description: ${resource.description || "No description available"}

`;
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
function createFeedbackPrompt(originalResponse, errorMessage, itemType, itemsDescription, userMessage) {
  return `Error parsing JSON: ${errorMessage}

Your original response:
${originalResponse}

Please try again with valid JSON for ${itemType} selection.
Available ${itemType}s:
${itemsDescription}

User request: ${userMessage}`;
}

export {
  validateToolSelection,
  validateResourceSelection,
  createToolSelectionFeedbackPrompt,
  createResourceSelectionFeedbackPrompt
};
