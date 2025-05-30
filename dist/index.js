// src/index.ts
import { logger as logger7 } from "@elizaos/core";

// src/actions/callToolAction.ts
import {
  ModelType as ModelType4,
  logger as logger4
} from "@elizaos/core";

// src/templates/toolSelectionTemplate.ts
var toolSelectionTemplate = `
{{{mcpProvider.text}}}

{{{recentMessages}}}

# Prompt

You are an intelligent assistant helping select the right tool to address a user's request.

Choose from the available MCP tools to address the user's request.

CRITICAL INSTRUCTIONS:
1. You MUST specify both a valid serverName AND toolName from the list above
2. The serverName value should match EXACTLY the server name shown in parentheses (Server: X)
   CORRECT: "serverName": "github"  (if the server is called "github")
   WRONG: "serverName": "GitHub" or "Github" or any other variation
3. The toolName value should match EXACTLY the tool name listed
   CORRECT: "toolName": "get_file_contents"  (if that's the exact tool name)
   WRONG: "toolName": "getFileContents" or "get-file-contents" or any variation
4. Identify the user's core information need or task
5. Select the most appropriate tool based on its capabilities and the request
6. For each required parameter, EXTRACT ACTUAL VALUES FROM THE CONVERSATION CONTEXT
   DO NOT use placeholder values like "octocat" or "Hello-World" unless explicitly mentioned by the user
7. If no tool seems appropriate, output {"noToolAvailable": true}

!!! YOUR RESPONSE MUST BE A VALID JSON OBJECT ONLY !!! 

STRICT FORMAT REQUIREMENTS:
- NO code block formatting (NO backticks or \`\`\`)
- NO comments (NO // or /* */)
- NO placeholders like "replace with...", "example", "your...", "actual", etc.
- Every parameter value must be a concrete, usable value (not instructions to replace)
- Use proper JSON syntax with double quotes for strings
- Use proper types: strings in quotes, numbers without quotes, booleans as true/false
- NO explanatory text before or after the JSON object

EXAMPLE FOR GITHUB FILE REQUEST:
{
  "serverName": "github",
  "toolName": "get_file_contents",
  "arguments": {
    "owner": "facebook",      // EXTRACT THIS FROM CONVERSATION, NOT "octocat" 
    "repo": "react",          // EXTRACT THIS FROM CONVERSATION, NOT "Hello-World"
    "path": "README.md",
    "branch": "main"
  },
  "reasoning": "The user wants to see the README from the facebook/react repository based on our conversation."
}

REMEMBER: Your response will be parsed directly as JSON. If it fails to parse, the operation will fail completely.
`;

// src/types.ts
var MCP_SERVICE_NAME = "mcp";
var DEFAULT_MCP_TIMEOUT_SECONDS = 6e4;
var DEFAULT_MAX_RETRIES = 2;
var ToolSelectionSchema = {
  type: "object",
  required: ["serverName", "toolName", "arguments"],
  properties: {
    serverName: {
      type: "string",
      minLength: 1,
      errorMessage: "serverName must not be empty"
    },
    toolName: {
      type: "string",
      minLength: 1,
      errorMessage: "toolName must not be empty"
    },
    arguments: {
      type: "object"
    },
    reasoning: {
      type: "string"
    },
    noToolAvailable: {
      type: "boolean"
    }
  }
};
var ResourceSelectionSchema = {
  type: "object",
  required: ["serverName", "uri"],
  properties: {
    serverName: {
      type: "string",
      minLength: 1,
      errorMessage: "serverName must not be empty"
    },
    uri: {
      type: "string",
      minLength: 1,
      errorMessage: "uri must not be empty"
    },
    reasoning: {
      type: "string"
    },
    noResourceAvailable: {
      type: "boolean"
    }
  }
};
var DEFAULT_PING_CONFIG = {
  enabled: true,
  intervalMs: 1e4,
  // 10 seconds
  timeoutMs: 5e3,
  // 5 seconds
  failuresBeforeDisconnect: 3
};
var MAX_RECONNECT_ATTEMPTS = 5;
var BACKOFF_MULTIPLIER = 2;
var INITIAL_RETRY_DELAY = 2e3;

// src/utils/error.ts
import {
  ModelType,
  composePromptFromState,
  logger
} from "@elizaos/core";

// src/templates/errorAnalysisPrompt.ts
var errorAnalysisPrompt = `
{{{mcpProvider.text}}}

{{{recentMessages}}}

# Prompt

You're an assistant helping a user, but there was an error accessing the resource you tried to use.

User request: "{{{userMessage}}}"
Error message: {{{error}}}

Create a helpful response that:
1. Acknowledges the issue in user-friendly terms
2. Offers alternative approaches to help if possible
3. Doesn't expose technical error details unless they're truly helpful
4. Maintains a helpful, conversational tone

Your response:
`;

// src/utils/error.ts
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

// src/utils/mcp.ts
import {
  ModelType as ModelType2,
  logger as logger2
} from "@elizaos/core";

// src/utils/json.ts
import Ajv from "ajv";
import JSON5 from "json5";
function parseJSON(input) {
  const cleanedInput = input.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  return JSON5.parse(cleanedInput);
}
var ajv = new Ajv({
  allErrors: true,
  strict: false
});
function validateJsonSchema(data, schema) {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      const errors = (validate.errors || []).map((err) => {
        const path = err.instancePath ? `${err.instancePath.replace(/^\//, "")}` : "value";
        return `${path}: ${err.message}`;
      });
      return { success: false, error: errors.join(", ") };
    }
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Schema validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// src/utils/mcp.ts
async function withModelRetry(initialInput, runtime, validationFn, message, composedState, createFeedbackPromptFn, callback, failureMsg, retryCount = 0) {
  const maxRetries = getMaxRetries(runtime);
  try {
    logger2.info("Raw response:", initialInput);
    const parsedJson = parseJSON(initialInput);
    logger2.info("Parsed response:", parsedJson);
    const validationResult = validationFn(parsedJson);
    if (!validationResult.success) {
      throw new Error(validationResult.error);
    }
    return validationResult.data;
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : "Unknown parsing error";
    logger2.error("Failed to parse response:", errorMessage);
    if (retryCount < maxRetries) {
      logger2.info(`Retrying (attempt ${retryCount + 1}/${maxRetries})`);
      const feedbackPrompt = createFeedbackPromptFn(
        initialInput,
        errorMessage,
        composedState,
        message.content.text || ""
      );
      const retrySelection = await runtime.useModel(ModelType2.TEXT_SMALL, {
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
        logger2.info(`Using configured selection retries: ${configValue}`);
        return configValue;
      }
    }
  } catch (error) {
    logger2.debug(
      "Error reading selection retries config:",
      error instanceof Error ? error.message : String(error)
    );
  }
  return DEFAULT_MAX_RETRIES;
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

// src/utils/processing.ts
import {
  ModelType as ModelType3,
  createUniqueUuid,
  logger as logger3
} from "@elizaos/core";
import { composePromptFromState as composePromptFromState2 } from "@elizaos/core";

// src/templates/resourceAnalysisTemplate.ts
var resourceAnalysisTemplate = `
{{{mcpProvider.text}}}

{{{recentMessages}}}

# Prompt

You are a helpful assistant responding to a user's request. You've just accessed the resource "{{{uri}}}" to help answer this request.

Original user request: "{{{userMessage}}}"

Resource metadata: 
{{{resourceMeta}}

Resource content: 
{{{resourceContent}}

Instructions:
1. Analyze how well the resource's content addresses the user's specific question or need
2. Identify the most relevant information from the resource
3. Create a natural, conversational response that incorporates this information
4. If the resource content is insufficient, acknowledge its limitations and explain what you can determine
5. Do not start with phrases like "According to the resource" or "Here's what I found" - instead, integrate the information naturally
6. Maintain your helpful, intelligent assistant personality while presenting the information

Your response (written as if directly to the user):
`;

// src/templates/toolReasoningTemplate.ts
var toolReasoningTemplate = `
{{{mcpProvider.text}}}

{{{recentMessages}}}

# Prompt

You are a helpful assistant responding to a user's request. You've just used the "{{{toolName}}}" tool from the "{{{serverName}}}" server to help answer this request.

Original user request: "{{{userMessage}}}"

Tool response:
{{{toolOutput}}}

{{#if hasAttachments}}
The tool also returned images or other media that will be shared with the user.
{{/if}}

Instructions:
1. Analyze how well the tool's response addresses the user's specific question or need
2. Identify the most relevant information from the tool's output
3. Create a natural, conversational response that incorporates this information
4. If the tool's response is insufficient, acknowledge its limitations and explain what you can determine
5. Do not start with phrases like "I used the X tool" or "Here's what I found" - instead, integrate the information naturally
6. Maintain your helpful, intelligent assistant personality while presenting the information

Your response (written as if directly to the user):
`;

// src/utils/processing.ts
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
  const analyzedResponse = await runtime.useModel(ModelType3.TEXT_SMALL, {
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
  logger3.info("reasoning prompt: ", reasoningPrompt);
  const reasonedResponse = await runtime.useModel(ModelType3.TEXT_SMALL, {
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
  return composePromptFromState2({
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
  return composePromptFromState2({
    state: enhancedState,
    template: toolReasoningTemplate
  });
}

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

// src/actions/callToolAction.ts
import { composePromptFromState as composePromptFromState3 } from "@elizaos/core";
function createToolSelectionPrompt(state, mcpProvider) {
  return composePromptFromState3({
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
      logger4.info(`Tool selection prompt: ${toolSelectionPrompt}`);
      const toolSelection = await runtime.useModel(ModelType4.TEXT_SMALL, {
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
      logger4.debug(`Selected tool "${toolName}" on server "${serverName}" because: ${reasoning}`);
      const result = await mcpService.callTool(serverName, toolName, toolArguments);
      logger4.debug(
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

// src/actions/readResourceAction.ts
import {
  ModelType as ModelType5,
  composePromptFromState as composePromptFromState4,
  logger as logger5
} from "@elizaos/core";

// src/templates/resourceSelectionTemplate.ts
var resourceSelectionTemplate = `
{{{mcpProvider.text}}}

{{{recentMessages}}}

# Prompt

You are an intelligent assistant helping select the right resource to address a user's request.

CRITICAL INSTRUCTIONS:
1. You MUST specify both a valid serverName AND uri from the list above
2. The serverName value should match EXACTLY the server name shown in parentheses (Server: X)
   CORRECT: "serverName": "github"  (if the server is called "github") 
   WRONG: "serverName": "GitHub" or "Github" or any other variation
3. The uri value should match EXACTLY the resource uri listed
   CORRECT: "uri": "weather://San Francisco/current"  (if that's the exact uri)
   WRONG: "uri": "weather://sanfrancisco/current" or any variation
4. Identify the user's information need from the conversation context
5. Select the most appropriate resource based on its description and the request
6. If no resource seems appropriate, output {"noResourceAvailable": true}

!!! YOUR RESPONSE MUST BE A VALID JSON OBJECT ONLY !!! 

STRICT FORMAT REQUIREMENTS:
- NO code block formatting (NO backticks or \`\`\`)
- NO comments (NO // or /* */)
- NO placeholders like "replace with...", "example", "your...", "actual", etc.
- Every parameter value must be a concrete, usable value (not instructions to replace)
- Use proper JSON syntax with double quotes for strings
- NO explanatory text before or after the JSON object

EXAMPLE RESPONSE:
{
  "serverName": "weather-server",
  "uri": "weather://San Francisco/current",
  "reasoning": "Based on the conversation, the user is asking about current weather in San Francisco. This resource provides up-to-date weather information for that city."
}

REMEMBER: Your response will be parsed directly as JSON. If it fails to parse, the operation will fail completely!
`;

// src/actions/readResourceAction.ts
function createResourceSelectionPrompt(composedState, userMessage) {
  const mcpData = composedState.values.mcp || {};
  const serverNames = Object.keys(mcpData);
  let resourcesDescription = "";
  for (const serverName of serverNames) {
    const server = mcpData[serverName];
    if (server.status !== "connected") continue;
    const resourceUris = Object.keys(server.resources || {});
    for (const uri of resourceUris) {
      const resource = server.resources[uri];
      resourcesDescription += `Resource: ${uri} (Server: ${serverName})
`;
      resourcesDescription += `Name: ${resource.name || "No name available"}
`;
      resourcesDescription += `Description: ${resource.description || "No description available"}
`;
      resourcesDescription += `MIME Type: ${resource.mimeType || "Not specified"}

`;
    }
  }
  const enhancedState = {
    ...composedState,
    values: {
      ...composedState.values,
      resourcesDescription,
      userMessage
    }
  };
  return composePromptFromState4({
    state: enhancedState,
    template: resourceSelectionTemplate
  });
}
var readResourceAction = {
  name: "READ_RESOURCE",
  similes: [
    "READ_MCP_RESOURCE",
    "GET_RESOURCE",
    "GET_MCP_RESOURCE",
    "FETCH_RESOURCE",
    "FETCH_MCP_RESOURCE",
    "ACCESS_RESOURCE",
    "ACCESS_MCP_RESOURCE"
  ],
  description: "Reads a resource from an MCP server",
  validate: async (runtime, _message, _state) => {
    const mcpService = runtime.getService(MCP_SERVICE_NAME);
    if (!mcpService) return false;
    const servers = mcpService.getServers();
    return servers.length > 0 && servers.some(
      (server) => server.status === "connected" && server.resources && server.resources.length > 0
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
      await sendInitialResponse(callback);
      const resourceSelectionPrompt = createResourceSelectionPrompt(
        composedState,
        message.content.text || ""
      );
      const resourceSelection = await runtime.useModel(ModelType5.TEXT_SMALL, {
        prompt: resourceSelectionPrompt
      });
      const parsedSelection = await withModelRetry(
        resourceSelection,
        runtime,
        (data) => validateResourceSelection(data),
        message,
        composedState,
        (originalResponse, errorMessage, state, userMessage) => createResourceSelectionFeedbackPrompt(originalResponse, errorMessage, state, userMessage),
        callback,
        "I'm having trouble figuring out where to find the information you're looking for. Could you provide more details about what you need?"
      );
      if (!parsedSelection || parsedSelection.noResourceAvailable) {
        if (callback && parsedSelection?.noResourceAvailable) {
          await callback({
            text: "I don't have a specific resource that contains the information you're looking for. Let me try to assist you directly instead.",
            thought: "No appropriate MCP resource available for this request. Falling back to direct assistance.",
            actions: ["REPLY"]
          });
        }
        return true;
      }
      const { serverName, uri, reasoning } = parsedSelection;
      logger5.debug(`Selected resource "${uri}" on server "${serverName}" because: ${reasoning}`);
      const result = await mcpService.readResource(serverName, uri);
      logger5.debug(`Read resource ${uri} from server ${serverName}`);
      const { resourceContent, resourceMeta } = processResourceResult(result, uri);
      await handleResourceAnalysis(
        runtime,
        message,
        uri,
        serverName,
        resourceContent,
        resourceMeta,
        callback
      );
      return true;
    } catch (error) {
      return handleMcpError(
        composedState,
        mcpProvider,
        error,
        runtime,
        message,
        "resource",
        callback
      );
    }
  },
  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: "Can you get the documentation about installing ElizaOS?"
        }
      },
      {
        name: "{{assistant}}",
        content: {
          text: `I'll retrieve that information for you. Let me access the resource...`,
          actions: ["READ_MCP_RESOURCE"]
        }
      },
      {
        name: "{{assistant}}",
        content: {
          text: `ElizaOS installation is straightforward. You'll need Node.js 23+ and Git installed. For Windows users, WSL 2 is required. The quickest way to get started is by cloning the ElizaOS starter repository with \`git clone https://github.com/elizaos/eliza-starter.git\`, then run \`cd eliza-starter && cp .env.example .env && bun i && bun run build && bun start\`. This will set up a development environment with the core features enabled. After starting, you can access the web interface at http://localhost:3000 to interact with your agent.`,
          actions: ["READ_MCP_RESOURCE"]
        }
      }
    ]
  ]
};

// src/provider.ts
var provider = {
  name: "MCP",
  description: "Information about connected MCP servers, tools, and resources",
  get: async (runtime, _message, _state) => {
    const mcpService = runtime.getService(MCP_SERVICE_NAME);
    if (!mcpService) {
      return {
        values: { mcp: {} },
        data: { mcp: {} },
        text: "No MCP servers are available."
      };
    }
    return mcpService.getProviderData();
  }
};

// src/service.ts
import { Service, logger as logger6 } from "@elizaos/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
var McpService = class _McpService extends Service {
  static serviceType = MCP_SERVICE_NAME;
  capabilityDescription = "Enables the agent to interact with MCP (Model Context Protocol) servers";
  connections = /* @__PURE__ */ new Map();
  connectionStates = /* @__PURE__ */ new Map();
  mcpProvider = {
    values: { mcp: {} },
    data: { mcp: {} },
    text: ""
  };
  pingConfig = DEFAULT_PING_CONFIG;
  constructor(runtime) {
    super(runtime);
  }
  async initialize(runtime) {
    this.runtime = runtime;
    await this.initializeMcpServers();
  }
  static async start(runtime) {
    const service = new _McpService(runtime);
    await service.initialize(runtime);
    return service;
  }
  async stop() {
    for (const [name] of this.connections) {
      await this.deleteConnection(name);
    }
    this.connections.clear();
    for (const state of this.connectionStates.values()) {
      if (state.pingInterval) clearInterval(state.pingInterval);
      if (state.reconnectTimeout) clearTimeout(state.reconnectTimeout);
    }
    this.connectionStates.clear();
  }
  async initializeMcpServers() {
    try {
      const mcpSettings = this.getMcpSettings();
      if (!mcpSettings || !mcpSettings.servers) {
        logger6.info("No MCP servers configured.");
        return;
      }
      await this.updateServerConnections(mcpSettings.servers);
      const servers = this.getServers();
      this.mcpProvider = buildMcpProviderData(servers);
    } catch (error) {
      logger6.error(
        "Failed to initialize MCP servers:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  getMcpSettings() {
    return this.runtime.getSetting("mcp");
  }
  async updateServerConnections(serverConfigs) {
    const currentNames = new Set(this.connections.keys());
    const newNames = new Set(Object.keys(serverConfigs));
    for (const name of currentNames) {
      if (!newNames.has(name)) {
        await this.deleteConnection(name);
        logger6.info(`Deleted MCP server: ${name}`);
      }
    }
    for (const [name, config] of Object.entries(serverConfigs)) {
      const currentConnection = this.connections.get(name);
      if (!currentConnection) {
        try {
          await this.initializeConnection(name, config);
        } catch (error) {
          logger6.error(
            `Failed to connect to new MCP server ${name}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      } else if (JSON.stringify(config) !== currentConnection.server.config) {
        try {
          await this.deleteConnection(name);
          await this.initializeConnection(name, config);
          logger6.info(`Reconnected MCP server with updated config: ${name}`);
        } catch (error) {
          logger6.error(
            `Failed to reconnect MCP server ${name}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }
  }
  async initializeConnection(name, config) {
    await this.deleteConnection(name);
    const state = {
      status: "connecting",
      reconnectAttempts: 0,
      consecutivePingFailures: 0
    };
    this.connectionStates.set(name, state);
    try {
      const client = new Client(
        { name: "ElizaOS", version: "1.0.0" },
        { capabilities: {} }
      );
      const transport = config.type === "stdio" ? await this.buildStdioClientTransport(name, config) : await this.buildSseClientTransport(name, config);
      const connection = {
        server: {
          name,
          config: JSON.stringify(config),
          status: "connecting"
        },
        client,
        transport
      };
      this.connections.set(name, connection);
      this.setupTransportHandlers(name, connection, state);
      await client.connect(transport);
      connection.server = {
        status: "connected",
        name,
        config: JSON.stringify(config),
        error: "",
        tools: await this.fetchToolsList(name),
        resources: await this.fetchResourcesList(name),
        resourceTemplates: await this.fetchResourceTemplatesList(name)
      };
      state.status = "connected";
      state.lastConnected = /* @__PURE__ */ new Date();
      state.reconnectAttempts = 0;
      state.consecutivePingFailures = 0;
      this.startPingMonitoring(name);
      logger6.info(`Successfully connected to MCP server: ${name}`);
    } catch (error) {
      state.status = "disconnected";
      state.lastError = error instanceof Error ? error : new Error(String(error));
      this.handleDisconnection(name, error);
      throw error;
    }
  }
  setupTransportHandlers(name, connection, state) {
    connection.transport.onerror = async (error) => {
      logger6.error(`Transport error for "${name}":`, error);
      connection.server.status = "disconnected";
      this.appendErrorMessage(connection, error.message);
      this.handleDisconnection(name, error);
    };
    connection.transport.onclose = async () => {
      connection.server.status = "disconnected";
      this.handleDisconnection(name, new Error("Transport closed"));
    };
  }
  startPingMonitoring(name) {
    const state = this.connectionStates.get(name);
    if (!state || !this.pingConfig.enabled) return;
    if (state.pingInterval) clearInterval(state.pingInterval);
    state.pingInterval = setInterval(() => {
      this.sendPing(name).catch((err) => {
        logger6.warn(`Ping failed for ${name}:`, err instanceof Error ? err.message : String(err));
        this.handlePingFailure(name, err);
      });
    }, this.pingConfig.intervalMs);
  }
  async sendPing(name) {
    const connection = this.connections.get(name);
    if (!connection) throw new Error(`No connection for ping: ${name}`);
    await Promise.race([
      connection.client.listTools(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Ping timeout")), this.pingConfig.timeoutMs))
    ]);
    const state = this.connectionStates.get(name);
    if (state) state.consecutivePingFailures = 0;
  }
  handlePingFailure(name, error) {
    const state = this.connectionStates.get(name);
    if (!state) return;
    state.consecutivePingFailures++;
    if (state.consecutivePingFailures >= this.pingConfig.failuresBeforeDisconnect) {
      logger6.warn(`Ping failures exceeded for ${name}, disconnecting and attempting reconnect.`);
      this.handleDisconnection(name, error);
    }
  }
  handleDisconnection(name, error) {
    const state = this.connectionStates.get(name);
    if (!state) return;
    state.status = "disconnected";
    state.lastError = error instanceof Error ? error : new Error(String(error));
    if (state.pingInterval) clearInterval(state.pingInterval);
    if (state.reconnectTimeout) clearTimeout(state.reconnectTimeout);
    if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger6.error(`Max reconnect attempts reached for ${name}. Giving up.`);
      return;
    }
    const delay = INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, state.reconnectAttempts);
    state.reconnectTimeout = setTimeout(async () => {
      state.reconnectAttempts++;
      logger6.info(`Attempting to reconnect to ${name} (attempt ${state.reconnectAttempts})...`);
      const config = this.connections.get(name)?.server.config;
      if (config) {
        try {
          await this.initializeConnection(name, JSON.parse(config));
        } catch (err) {
          logger6.error(`Reconnect attempt failed for ${name}:`, err instanceof Error ? err.message : String(err));
          this.handleDisconnection(name, err);
        }
      }
    }, delay);
  }
  async deleteConnection(name) {
    const connection = this.connections.get(name);
    if (connection) {
      try {
        await connection.transport.close();
        await connection.client.close();
      } catch (error) {
        logger6.error(
          `Failed to close transport for ${name}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
      this.connections.delete(name);
    }
    const state = this.connectionStates.get(name);
    if (state) {
      if (state.pingInterval) clearInterval(state.pingInterval);
      if (state.reconnectTimeout) clearTimeout(state.reconnectTimeout);
      this.connectionStates.delete(name);
    }
  }
  getServerConnection(serverName) {
    return this.connections.get(serverName);
  }
  async buildStdioClientTransport(name, config) {
    if (!config.command) {
      throw new Error(`Missing command for stdio MCP server ${name}`);
    }
    return new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: {
        ...config.env,
        ...process.env.PATH ? { PATH: process.env.PATH } : {}
      },
      stderr: "pipe",
      cwd: config.cwd
    });
  }
  async buildSseClientTransport(name, config) {
    if (!config.url) {
      throw new Error(`Missing URL for SSE MCP server ${name}`);
    }
    return new SSEClientTransport(new URL(config.url));
  }
  appendErrorMessage(connection, error) {
    const newError = connection.server.error ? `${connection.server.error}
${error}` : error;
    connection.server.error = newError;
  }
  async fetchToolsList(serverName) {
    try {
      const connection = this.getServerConnection(serverName);
      if (!connection) {
        return [];
      }
      const response = await connection.client.listTools();
      const tools = (response?.tools || []).map((tool) => ({
        ...tool
      }));
      logger6.info(`Fetched ${tools.length} tools for ${serverName}`);
      for (const tool of tools) {
        logger6.info(`[${serverName}] ${tool.name}: ${tool.description}`);
      }
      return tools;
    } catch (error) {
      logger6.error(
        `Failed to fetch tools for ${serverName}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }
  async fetchResourcesList(serverName) {
    try {
      const connection = this.getServerConnection(serverName);
      if (!connection) {
        return [];
      }
      const response = await connection.client.listResources();
      return response?.resources || [];
    } catch (error) {
      logger6.warn(
        `No resources found for ${serverName}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }
  async fetchResourceTemplatesList(serverName) {
    try {
      const connection = this.getServerConnection(serverName);
      if (!connection) {
        return [];
      }
      const response = await connection.client.listResourceTemplates();
      return response?.resourceTemplates || [];
    } catch (error) {
      logger6.warn(
        `No resource templates found for ${serverName}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }
  getServers() {
    return Array.from(this.connections.values()).filter((conn) => !conn.server.disabled).map((conn) => conn.server);
  }
  getProviderData() {
    return this.mcpProvider;
  }
  async callTool(serverName, toolName, toolArguments) {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`No connection found for server: ${serverName}`);
    }
    if (connection.server.disabled) {
      throw new Error(`Server "${serverName}" is disabled`);
    }
    let timeout = DEFAULT_MCP_TIMEOUT_SECONDS;
    try {
      const config = JSON.parse(connection.server.config);
      timeout = config.timeoutInMillis || DEFAULT_MCP_TIMEOUT_SECONDS;
    } catch (error) {
      logger6.error(
        `Failed to parse timeout configuration for server ${serverName}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
    const result = await connection.client.callTool(
      { name: toolName, arguments: toolArguments },
      void 0,
      { timeout }
    );
    if (!result.content) {
      throw new Error("Invalid tool result: missing content array");
    }
    return result;
  }
  async readResource(serverName, uri) {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`No connection found for server: ${serverName}`);
    }
    if (connection.server.disabled) {
      throw new Error(`Server "${serverName}" is disabled`);
    }
    return await connection.client.readResource({ uri });
  }
  async restartConnection(serverName) {
    const connection = this.connections.get(serverName);
    const config = connection?.server.config;
    if (config) {
      logger6.info(`Restarting ${serverName} MCP server...`);
      connection.server.status = "connecting";
      connection.server.error = "";
      try {
        await this.deleteConnection(serverName);
        await this.initializeConnection(serverName, JSON.parse(config));
        logger6.info(`${serverName} MCP server connected`);
      } catch (error) {
        logger6.error(
          `Failed to restart connection for ${serverName}:`,
          error instanceof Error ? error.message : String(error)
        );
        throw new Error(`Failed to connect to ${serverName} MCP server`);
      }
    }
  }
};

// src/index.ts
var mcpPlugin = {
  name: "mcp",
  description: "Plugin for connecting to MCP (Model Context Protocol) servers",
  init: async (_config, runtime) => {
    logger7.info("Initializing MCP plugin...");
    const service = await McpService.start(runtime);
    await service.initialize(runtime);
  },
  services: [McpService],
  actions: [callToolAction, readResourceAction],
  providers: [provider]
};
var index_default = mcpPlugin;
export {
  index_default as default
};
