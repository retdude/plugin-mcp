import {
  errorAnalysisPrompt
} from "./chunk-LHWU7B75.js";

// src/utils/error.ts
import {
  ModelType,
  composePromptFromState,
  logger
} from "@elizaos/core";
async function handleMcpError(state, mcpProvider, error, runtime, message, type, callback) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Error executing MCP ${type}: ${errorMessage}`, error);
  if (callback) {
    const enhancedState = {
      ...state,
      values: {
        ...state.values,
        mcpProvider,
        userMessage: message.content.text || "",
        error: errorMessage
      }
    };
    const prompt = composePromptFromState({
      state: enhancedState,
      template: errorAnalysisPrompt
    });
    try {
      const errorResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt
      });
      await callback({
        thought: `Error calling MCP ${type}: ${errorMessage}. Providing a helpful response to the user.`,
        text: errorResponse,
        actions: ["REPLY"]
      });
    } catch (modelError) {
      logger.error(
        "Failed to generate error response:",
        modelError instanceof Error ? modelError.message : String(modelError)
      );
      await callback({
        thought: `Error calling MCP ${type} and failed to generate a custom response. Providing a generic fallback response.`,
        text: `I'm sorry, I wasn't able to get the information you requested. There seems to be an issue with the ${type} right now. Is there something else I can help you with?`,
        actions: ["REPLY"]
      });
    }
  }
  return false;
}
var McpError = class _McpError extends Error {
  constructor(message, code = "UNKNOWN") {
    super(message);
    this.code = code;
    this.name = "McpError";
  }
  static connectionError(serverName, details) {
    return new _McpError(
      `Failed to connect to server '${serverName}'${details ? `: ${details}` : ""}`,
      "CONNECTION_ERROR"
    );
  }
  static toolNotFound(toolName, serverName) {
    return new _McpError(`Tool '${toolName}' not found on server '${serverName}'`, "TOOL_NOT_FOUND");
  }
  static resourceNotFound(uri, serverName) {
    return new _McpError(
      `Resource '${uri}' not found on server '${serverName}'`,
      "RESOURCE_NOT_FOUND"
    );
  }
  static validationError(details) {
    return new _McpError(`Validation error: ${details}`, "VALIDATION_ERROR");
  }
  static serverError(serverName, details) {
    return new _McpError(
      `Server error from '${serverName}'${details ? `: ${details}` : ""}`,
      "SERVER_ERROR"
    );
  }
};

export {
  handleMcpError,
  McpError
};
