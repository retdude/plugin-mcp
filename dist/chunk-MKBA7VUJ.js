import {
  createMcpMemory
} from "./chunk-M4JGR7FW.js";
import {
  resourceAnalysisTemplate
} from "./chunk-35AEOLSM.js";
import {
  toolReasoningTemplate
} from "./chunk-BZHGAYIR.js";

// src/utils/processing.ts
import {
  ModelType,
  createUniqueUuid,
  logger
} from "@elizaos/core";
import { composePromptFromState } from "@elizaos/core";
function processResourceResult(result, uri) {
  let resourceContent = "";
  let resourceMeta = "";
  for (const content of result.contents) {
    if (content.text) {
      resourceContent += content.text;
    } else if (content.blob) {
      resourceContent += `[Binary data - ${content.mimeType || "unknown type"}]`;
    }
    resourceMeta += `Resource: ${content.uri || uri}
`;
    if (content.mimeType) {
      resourceMeta += `Type: ${content.mimeType}
`;
    }
  }
  return { resourceContent, resourceMeta };
}
function processToolResult(result, serverName, toolName, runtime, messageEntityId) {
  let toolOutput = "";
  let hasAttachments = false;
  const attachments = [];
  for (const content of result.content) {
    if (content.type === "text") {
      toolOutput += content.text;
    } else if (content.type === "image") {
      hasAttachments = true;
      attachments.push({
        contentType: content.mimeType,
        url: `data:${content.mimeType};base64,${content.data}`,
        id: createUniqueUuid(runtime, messageEntityId),
        title: "Generated image",
        source: `${serverName}/${toolName}`,
        description: "Tool-generated image",
        text: "Generated image"
      });
    } else if (content.type === "resource") {
      const resource = content.resource;
      if (resource && "text" in resource) {
        toolOutput += `

Resource (${resource.uri}):
${resource.text}`;
      } else if (resource && "blob" in resource) {
        toolOutput += `

Resource (${resource.uri}): [Binary data]`;
      }
    }
  }
  return { toolOutput, hasAttachments, attachments };
}
async function handleResourceAnalysis(runtime, message, uri, serverName, resourceContent, resourceMeta, callback) {
  await createMcpMemory(runtime, message, "resource", serverName, resourceContent, {
    uri,
    isResourceAccess: true
  });
  const analysisPrompt = createAnalysisPrompt(
    uri,
    message.content.text || "",
    resourceContent,
    resourceMeta
  );
  const analyzedResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
    prompt: analysisPrompt
  });
  if (callback) {
    await callback({
      text: analyzedResponse,
      thought: `I analyzed the content from the ${uri} resource on ${serverName} and crafted a thoughtful response that addresses the user's request while maintaining my conversational style.`,
      actions: ["READ_MCP_RESOURCE"]
    });
  }
}
async function handleToolResponse(runtime, message, serverName, toolName, toolArgs, toolOutput, hasAttachments, attachments, state, mcpProvider, callback) {
  await createMcpMemory(runtime, message, "tool", serverName, toolOutput, {
    toolName,
    arguments: toolArgs,
    isToolCall: true
  });
  const reasoningPrompt = createReasoningPrompt(
    state,
    mcpProvider,
    toolName,
    serverName,
    message.content.text || "",
    toolOutput,
    hasAttachments
  );
  logger.info("reasoning prompt: ", reasoningPrompt);
  const reasonedResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
    prompt: reasoningPrompt
  });
  if (callback) {
    await callback({
      text: reasonedResponse,
      thought: `I analyzed the output from the ${toolName} tool on ${serverName} and crafted a thoughtful response that addresses the user's request while maintaining my conversational style.`,
      actions: ["CALL_MCP_TOOL"],
      attachments: hasAttachments ? attachments : void 0
    });
  }
}
async function sendInitialResponse(callback) {
  if (callback) {
    const responseContent = {
      thought: "The user is asking for information that can be found in an MCP resource. I will retrieve and analyze the appropriate resource.",
      text: "I'll retrieve that information for you. Let me access the resource...",
      actions: ["READ_MCP_RESOURCE"]
    };
    await callback(responseContent);
  }
}
function createAnalysisPrompt(uri, userMessage, resourceContent, resourceMeta) {
  const enhancedState = {
    data: {},
    text: "",
    values: {
      uri,
      userMessage,
      resourceContent,
      resourceMeta
    }
  };
  return composePromptFromState({
    state: enhancedState,
    template: resourceAnalysisTemplate
  });
}
function createReasoningPrompt(state, mcpProvider, toolName, serverName, userMessage, toolOutput, hasAttachments) {
  const enhancedState = {
    ...state,
    values: {
      ...state.values,
      mcpProvider,
      toolName,
      serverName,
      userMessage,
      toolOutput,
      hasAttachments
    }
  };
  return composePromptFromState({
    state: enhancedState,
    template: toolReasoningTemplate
  });
}

export {
  processResourceResult,
  processToolResult,
  handleResourceAnalysis,
  handleToolResponse,
  sendInitialResponse
};
