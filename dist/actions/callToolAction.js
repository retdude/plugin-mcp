import {
  handleMcpError
} from "../chunk-6XTVNA6D.js";
import {
  handleToolResponse,
  processToolResult
} from "../chunk-MKBA7VUJ.js";
import {
  withModelRetry
} from "../chunk-M4JGR7FW.js";
import {
  createToolSelectionFeedbackPrompt,
  validateToolSelection
} from "../chunk-M5HXVVUH.js";
import {
  MCP_SERVICE_NAME
} from "../chunk-OX6R62CA.js";
import "../chunk-NIQ7OFFJ.js";
import "../chunk-LHWU7B75.js";
import "../chunk-35AEOLSM.js";
import "../chunk-BZHGAYIR.js";
import {
  toolSelectionTemplate
} from "../chunk-FK2XVCMM.js";

// src/actions/callToolAction.ts
import {
  ModelType,
  logger
} from "@elizaos/core";
import { composePromptFromState } from "@elizaos/core";
function createToolSelectionPrompt(state, mcpProvider) {
  return composePromptFromState({
    state: {
      ...state,
      values: {
        ...state.values,
        mcpProvider
      }
    },
    template: toolSelectionTemplate
  });
}
var callToolAction = {
  name: "CALL_TOOL",
  similes: [
    "CALL_MCP_TOOL",
    "USE_TOOL",
    "USE_MCP_TOOL",
    "EXECUTE_TOOL",
    "EXECUTE_MCP_TOOL",
    "RUN_TOOL",
    "RUN_MCP_TOOL",
    "INVOKE_TOOL",
    "INVOKE_MCP_TOOL"
  ],
  description: "Calls a tool from an MCP server to perform a specific task",
  validate: async (runtime, _message, _state) => {
    const mcpService = runtime.getService(MCP_SERVICE_NAME);
    if (!mcpService) return false;
    const servers = mcpService.getServers();
    return servers.length > 0 && servers.some(
      (server) => server.status === "connected" && server.tools && server.tools.length > 0
    );
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const composedState = await runtime.composeState(message, ["RECENT_MESSAGES", "MCP"]);
    const mcpService = runtime.getService(MCP_SERVICE_NAME);
    if (!mcpService) {
      throw new Error("MCP service not available");
    }
    const mcpProvider = mcpService.getProviderData();
    try {
      const toolSelectionPrompt = createToolSelectionPrompt(composedState, mcpProvider);
      logger.info(`Tool selection prompt: ${toolSelectionPrompt}`);
      const toolSelection = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: toolSelectionPrompt
      });
      const parsedSelection = await withModelRetry(
        toolSelection,
        runtime,
        (data) => validateToolSelection(data, composedState),
        message,
        composedState,
        (originalResponse, errorMessage, state, userMessage) => createToolSelectionFeedbackPrompt(originalResponse, errorMessage, state, userMessage),
        callback,
        "I'm having trouble figuring out the best way to help with your request. Could you provide more details about what you're looking for?"
      );
      if (!parsedSelection || parsedSelection.noToolAvailable) {
        if (callback && parsedSelection?.noToolAvailable) {
          await callback({
            text: "I don't have a specific tool that can help with that request. Let me try to assist you directly instead.",
            thought: "No appropriate MCP tool available for this request. Falling back to direct assistance.",
            actions: ["REPLY"]
          });
        }
        return true;
      }
      const { serverName, toolName, arguments: toolArguments, reasoning } = parsedSelection;
      logger.debug(`Selected tool "${toolName}" on server "${serverName}" because: ${reasoning}`);
      const result = await mcpService.callTool(serverName, toolName, toolArguments);
      logger.debug(
        `Called tool ${toolName} on server ${serverName} with arguments ${JSON.stringify(toolArguments)}`
      );
      const { toolOutput, hasAttachments, attachments } = processToolResult(
        result,
        serverName,
        toolName,
        runtime,
        message.entityId
      );
      await handleToolResponse(
        runtime,
        message,
        serverName,
        toolName,
        toolArguments,
        toolOutput,
        hasAttachments,
        attachments,
        composedState,
        mcpProvider,
        callback
      );
      return true;
    } catch (error) {
      return handleMcpError(composedState, mcpProvider, error, runtime, message, "tool", callback);
    }
  },
  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: "Can you search for information about climate change?"
        }
      },
      {
        name: "{{assistant}}",
        content: {
          text: "I'll help you with that request. Let me access the right tool...",
          actions: ["CALL_MCP_TOOL"]
        }
      },
      {
        name: "{{assistant}}",
        content: {
          text: "I found the following information about climate change:\n\nClimate change refers to long-term shifts in temperatures and weather patterns. These shifts may be natural, but since the 1800s, human activities have been the main driver of climate change, primarily due to the burning of fossil fuels like coal, oil, and gas, which produces heat-trapping gases.",
          actions: ["CALL_MCP_TOOL"]
        }
      }
    ]
  ]
};
export {
  callToolAction
};
