import {
  DEFAULT_MAX_RETRIES
} from "./chunk-OX6R62CA.js";
import {
  parseJSON
} from "./chunk-NIQ7OFFJ.js";

// src/utils/mcp.ts
import {
  ModelType,
  logger
} from "@elizaos/core";
async function withModelRetry(initialInput, runtime, validationFn, message, composedState, createFeedbackPromptFn, callback, failureMsg, retryCount = 0) {
  const maxRetries = getMaxRetries(runtime);
  try {
    logger.info("Raw response:", initialInput);
    const parsedJson = parseJSON(initialInput);
    logger.info("Parsed response:", parsedJson);
    const validationResult = validationFn(parsedJson);
    if (!validationResult.success) {
      throw new Error(validationResult.error);
    }
    return validationResult.data;
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : "Unknown parsing error";
    logger.error("Failed to parse response:", errorMessage);
    if (retryCount < maxRetries) {
      logger.info(`Retrying (attempt ${retryCount + 1}/${maxRetries})`);
      const feedbackPrompt = createFeedbackPromptFn(
        initialInput,
        errorMessage,
        composedState,
        message.content.text || ""
      );
      const retrySelection = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: feedbackPrompt
      });
      return withModelRetry(
        retrySelection,
        runtime,
        validationFn,
        message,
        composedState,
        createFeedbackPromptFn,
        callback,
        failureMsg,
        retryCount + 1
      );
    }
    if (callback && failureMsg) {
      await callback({
        text: failureMsg,
        thought: "Failed to parse response after multiple retries. Requesting clarification from user.",
        actions: ["REPLY"]
      });
    }
    return null;
  }
}
function getMaxRetries(runtime) {
  try {
    const settings = runtime.getSetting("mcp");
    if (settings && "maxRetries" in settings && settings.maxRetries !== void 0) {
      const configValue = Number(settings.maxRetries);
      if (!Number.isNaN(configValue) && configValue >= 0) {
        logger.info(`Using configured selection retries: ${configValue}`);
        return configValue;
      }
    }
  } catch (error) {
    logger.debug(
      "Error reading selection retries config:",
      error instanceof Error ? error.message : String(error)
    );
  }
  return DEFAULT_MAX_RETRIES;
}
async function handleNoSelectionAvailable(selection, callback, message = "I don't have a specific item that can help with that request. Let me try to assist you directly instead.") {
  if (selection.noToolAvailable || selection.noResourceAvailable) {
    if (callback) {
      await callback({
        text: message,
        thought: "No appropriate MCP item available for this request. Falling back to direct assistance.",
        actions: ["REPLY"]
      });
    }
    return true;
  }
  return false;
}
async function createMcpMemory(runtime, message, type, serverName, content, metadata) {
  const memory = await runtime.addEmbeddingToMemory({
    entityId: message.entityId,
    agentId: runtime.agentId,
    roomId: message.roomId,
    content: {
      text: `Used the "${type}" from "${serverName}" server. 
        Content: ${content}`,
      metadata: {
        ...metadata,
        serverName
      }
    }
  });
  await runtime.createMemory(memory, type === "resource" ? "resources" : "tools", true);
}
function buildMcpProviderData(servers) {
  const mcpData = {};
  let textContent = "";
  if (servers.length === 0) {
    return {
      values: { mcp: {} },
      data: { mcp: {} },
      text: "No MCP servers are currently connected."
    };
  }
  for (const server of servers) {
    mcpData[server.name] = {
      status: server.status,
      tools: {},
      resources: {}
    };
    textContent += `## Server: ${server.name} (${server.status})

`;
    if (server.tools && server.tools.length > 0) {
      textContent += "### Tools:\n\n";
      for (const tool of server.tools) {
        mcpData[server.name].tools[tool.name] = {
          description: tool.description || "No description available",
          inputSchema: tool.inputSchema || {}
        };
        textContent += `- **${tool.name}**: ${tool.description || "No description available"}
`;
        if (tool.inputSchema?.properties) {
          textContent += `  Parameters: ${JSON.stringify(tool.inputSchema.properties)}
`;
        }
      }
      textContent += "\n";
    }
    if (server.resources && server.resources.length > 0) {
      textContent += "### Resources:\n\n";
      for (const resource of server.resources) {
        mcpData[server.name].resources[resource.uri] = {
          name: resource.name,
          description: resource.description || "No description available",
          mimeType: resource.mimeType
        };
        textContent += `- **${resource.name}** (${resource.uri}): ${resource.description || "No description available"}
`;
      }
      textContent += "\n";
    }
  }
  return {
    values: { mcp: mcpData },
    data: { mcp: mcpData },
    text: `# MCP Configuration

${textContent}`
  };
}

export {
  withModelRetry,
  getMaxRetries,
  handleNoSelectionAvailable,
  createMcpMemory,
  buildMcpProviderData
};
