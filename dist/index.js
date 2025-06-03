var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/tool-compatibility/providers/openai.ts
var openai_exports = {};
__export(openai_exports, {
  OpenAIMcpCompatibility: () => OpenAIMcpCompatibility2,
  OpenAIReasoningMcpCompatibility: () => OpenAIReasoningMcpCompatibility
});
var OpenAIMcpCompatibility2, OpenAIReasoningMcpCompatibility;
var init_openai = __esm({
  "src/tool-compatibility/providers/openai.ts"() {
    "use strict";
    init_tool_compatibility();
    OpenAIMcpCompatibility2 = class extends McpToolCompatibility {
      constructor(modelInfo2) {
        super(modelInfo2);
      }
      shouldApply() {
        return this.modelInfo.provider === "openai" && (!this.modelInfo.supportsStructuredOutputs || this.modelInfo.isReasoningModel === true);
      }
      getUnsupportedStringProperties() {
        const baseUnsupported = ["format"];
        if (this.modelInfo.isReasoningModel === true) {
          return [...baseUnsupported, "pattern"];
        }
        if (this.modelInfo.modelId.includes("gpt-3.5") || this.modelInfo.modelId.includes("davinci")) {
          return [...baseUnsupported, "pattern"];
        }
        return baseUnsupported;
      }
      getUnsupportedNumberProperties() {
        if (this.modelInfo.isReasoningModel === true) {
          return ["exclusiveMinimum", "exclusiveMaximum", "multipleOf"];
        }
        return [];
      }
      getUnsupportedArrayProperties() {
        if (this.modelInfo.isReasoningModel === true) {
          return ["uniqueItems"];
        }
        return [];
      }
      getUnsupportedObjectProperties() {
        return ["minProperties", "maxProperties"];
      }
    };
    OpenAIReasoningMcpCompatibility = class extends McpToolCompatibility {
      constructor(modelInfo2) {
        super(modelInfo2);
      }
      shouldApply() {
        return this.modelInfo.provider === "openai" && this.modelInfo.isReasoningModel === true;
      }
      getUnsupportedStringProperties() {
        return ["format", "pattern", "minLength", "maxLength"];
      }
      getUnsupportedNumberProperties() {
        return ["exclusiveMinimum", "exclusiveMaximum", "multipleOf"];
      }
      getUnsupportedArrayProperties() {
        return ["uniqueItems", "minItems", "maxItems"];
      }
      getUnsupportedObjectProperties() {
        return ["minProperties", "maxProperties", "additionalProperties"];
      }
      // Override the mergeDescription for reasoning models to be more explicit
      mergeDescription(originalDescription, constraints) {
        const constraintText = this.formatConstraintsForReasoningModel(constraints);
        if (originalDescription) {
          return `${originalDescription}

IMPORTANT: ${constraintText}`;
        }
        return `IMPORTANT: ${constraintText}`;
      }
      formatConstraintsForReasoningModel(constraints) {
        const rules = [];
        if (constraints.minLength) {
          rules.push(`minimum ${constraints.minLength} characters`);
        }
        if (constraints.maxLength) {
          rules.push(`maximum ${constraints.maxLength} characters`);
        }
        if (constraints.minimum !== void 0) {
          rules.push(`must be >= ${constraints.minimum}`);
        }
        if (constraints.maximum !== void 0) {
          rules.push(`must be <= ${constraints.maximum}`);
        }
        if (constraints.format === "email") {
          rules.push(`must be a valid email address`);
        }
        if (constraints.format === "uri" || constraints.format === "url") {
          rules.push(`must be a valid URL`);
        }
        if (constraints.format === "uuid") {
          rules.push(`must be a valid UUID`);
        }
        if (constraints.pattern) {
          rules.push(`must match pattern: ${constraints.pattern}`);
        }
        if (constraints.enum) {
          rules.push(`must be one of: ${constraints.enum.join(", ")}`);
        }
        if (constraints.minItems) {
          rules.push(`array must have at least ${constraints.minItems} items`);
        }
        if (constraints.maxItems) {
          rules.push(`array must have at most ${constraints.maxItems} items`);
        }
        return rules.length > 0 ? rules.join(", ") : JSON.stringify(constraints);
      }
    };
  }
});

// src/tool-compatibility/providers/anthropic.ts
var anthropic_exports = {};
__export(anthropic_exports, {
  AnthropicMcpCompatibility: () => AnthropicMcpCompatibility2
});
var AnthropicMcpCompatibility2;
var init_anthropic = __esm({
  "src/tool-compatibility/providers/anthropic.ts"() {
    "use strict";
    init_tool_compatibility();
    AnthropicMcpCompatibility2 = class extends McpToolCompatibility {
      constructor(modelInfo2) {
        super(modelInfo2);
      }
      shouldApply() {
        return this.modelInfo.provider === "anthropic";
      }
      getUnsupportedStringProperties() {
        return [];
      }
      getUnsupportedNumberProperties() {
        return [];
      }
      getUnsupportedArrayProperties() {
        return [];
      }
      getUnsupportedObjectProperties() {
        return ["additionalProperties"];
      }
      // Override to provide a cleaner description format for Anthropic
      mergeDescription(originalDescription, constraints) {
        const constraintHints = this.formatConstraintsForAnthropic(constraints);
        if (originalDescription && constraintHints) {
          return `${originalDescription}. ${constraintHints}`;
        } else if (constraintHints) {
          return constraintHints;
        }
        return originalDescription || "";
      }
      formatConstraintsForAnthropic(constraints) {
        const hints = [];
        if (constraints.additionalProperties === false) {
          hints.push("Only use the specified properties");
        }
        if (constraints.format === "date-time") {
          hints.push("Use ISO 8601 date-time format");
        }
        if (constraints.pattern) {
          hints.push(`Must match the pattern: ${constraints.pattern}`);
        }
        return hints.join(". ");
      }
    };
  }
});

// src/tool-compatibility/providers/google.ts
var google_exports = {};
__export(google_exports, {
  GoogleMcpCompatibility: () => GoogleMcpCompatibility2
});
var GoogleMcpCompatibility2;
var init_google = __esm({
  "src/tool-compatibility/providers/google.ts"() {
    "use strict";
    init_tool_compatibility();
    GoogleMcpCompatibility2 = class extends McpToolCompatibility {
      constructor(modelInfo2) {
        super(modelInfo2);
      }
      shouldApply() {
        return this.modelInfo.provider === "google";
      }
      getUnsupportedStringProperties() {
        return ["minLength", "maxLength", "pattern", "format"];
      }
      getUnsupportedNumberProperties() {
        return ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"];
      }
      getUnsupportedArrayProperties() {
        return ["minItems", "maxItems", "uniqueItems"];
      }
      getUnsupportedObjectProperties() {
        return ["minProperties", "maxProperties", "additionalProperties"];
      }
      // Override to provide Google-optimized constraint descriptions
      mergeDescription(originalDescription, constraints) {
        const constraintText = this.formatConstraintsForGoogle(constraints);
        if (originalDescription && constraintText) {
          return `${originalDescription}

Constraints: ${constraintText}`;
        } else if (constraintText) {
          return `Constraints: ${constraintText}`;
        }
        return originalDescription || "";
      }
      formatConstraintsForGoogle(constraints) {
        const rules = [];
        if (constraints.minLength) {
          rules.push(`text must be at least ${constraints.minLength} characters long`);
        }
        if (constraints.maxLength) {
          rules.push(`text must be no more than ${constraints.maxLength} characters long`);
        }
        if (constraints.minimum !== void 0) {
          rules.push(`number must be at least ${constraints.minimum}`);
        }
        if (constraints.maximum !== void 0) {
          rules.push(`number must be no more than ${constraints.maximum}`);
        }
        if (constraints.exclusiveMinimum !== void 0) {
          rules.push(`number must be greater than ${constraints.exclusiveMinimum}`);
        }
        if (constraints.exclusiveMaximum !== void 0) {
          rules.push(`number must be less than ${constraints.exclusiveMaximum}`);
        }
        if (constraints.multipleOf) {
          rules.push(`number must be a multiple of ${constraints.multipleOf}`);
        }
        if (constraints.format === "email") {
          rules.push(`must be a valid email address`);
        }
        if (constraints.format === "uri" || constraints.format === "url") {
          rules.push(`must be a valid URL starting with http:// or https://`);
        }
        if (constraints.format === "uuid") {
          rules.push(`must be a valid UUID in the format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
        }
        if (constraints.format === "date-time") {
          rules.push(`must be a valid ISO 8601 date-time (e.g., 2023-12-25T10:30:00Z)`);
        }
        if (constraints.pattern) {
          rules.push(`must match the regular expression pattern: ${constraints.pattern}`);
        }
        if (constraints.enum && Array.isArray(constraints.enum)) {
          rules.push(`must be exactly one of these values: ${constraints.enum.join(", ")}`);
        }
        if (constraints.minItems) {
          rules.push(`array must contain at least ${constraints.minItems} items`);
        }
        if (constraints.maxItems) {
          rules.push(`array must contain no more than ${constraints.maxItems} items`);
        }
        if (constraints.uniqueItems === true) {
          rules.push(`array items must all be unique (no duplicates)`);
        }
        if (constraints.minProperties) {
          rules.push(`object must have at least ${constraints.minProperties} properties`);
        }
        if (constraints.maxProperties) {
          rules.push(`object must have no more than ${constraints.maxProperties} properties`);
        }
        if (constraints.additionalProperties === false) {
          rules.push(`object must only contain the specified properties, no additional properties allowed`);
        }
        return rules.join("; ");
      }
    };
  }
});

// src/tool-compatibility/index.ts
function detectModelProvider(runtime2) {
  const modelString = runtime2?.modelProvider || runtime2?.model || "";
  const modelId = String(modelString).toLowerCase();
  let provider = "unknown";
  let supportsStructuredOutputs = false;
  let isReasoningModel = false;
  if (modelId.includes("openai") || modelId.includes("gpt-") || modelId.includes("o1-") || modelId.includes("o3-")) {
    provider = "openai";
    supportsStructuredOutputs = modelId.includes("gpt-4") || modelId.includes("o1") || modelId.includes("o3");
    isReasoningModel = modelId.includes("o1") || modelId.includes("o3");
  } else if (modelId.includes("anthropic") || modelId.includes("claude")) {
    provider = "anthropic";
    supportsStructuredOutputs = true;
  } else if (modelId.includes("google") || modelId.includes("gemini")) {
    provider = "google";
    supportsStructuredOutputs = true;
  } else if (modelId.includes("openrouter")) {
    provider = "openrouter";
    supportsStructuredOutputs = false;
  }
  return {
    provider,
    modelId,
    supportsStructuredOutputs,
    isReasoningModel
  };
}
async function createMcpToolCompatibility(runtime2) {
  const modelInfo2 = detectModelProvider(runtime2);
  try {
    switch (modelInfo2.provider) {
      case "openai":
        const { OpenAIMcpCompatibility: OpenAIMcpCompatibility3 } = await Promise.resolve().then(() => (init_openai(), openai_exports));
        return new OpenAIMcpCompatibility3(modelInfo2);
      case "anthropic":
        const { AnthropicMcpCompatibility: AnthropicMcpCompatibility3 } = await Promise.resolve().then(() => (init_anthropic(), anthropic_exports));
        return new AnthropicMcpCompatibility3(modelInfo2);
      case "google":
        const { GoogleMcpCompatibility: GoogleMcpCompatibility3 } = await Promise.resolve().then(() => (init_google(), google_exports));
        return new GoogleMcpCompatibility3(modelInfo2);
      default:
        return null;
    }
  } catch (error) {
    console.warn("Failed to load compatibility provider:", error);
    return null;
  }
}
function createMcpToolCompatibilitySync(runtime) {
  const modelInfo = detectModelProvider(runtime);
  try {
    switch (modelInfo.provider) {
      case "openai":
        const OpenAIModule = eval("require")("./providers/openai");
        const { OpenAIMcpCompatibility } = OpenAIModule;
        return new OpenAIMcpCompatibility(modelInfo);
      case "anthropic":
        const AnthropicModule = eval("require")("./providers/anthropic");
        const { AnthropicMcpCompatibility } = AnthropicModule;
        return new AnthropicMcpCompatibility(modelInfo);
      case "google":
        const GoogleModule = eval("require")("./providers/google");
        const { GoogleMcpCompatibility } = GoogleModule;
        return new GoogleMcpCompatibility(modelInfo);
      default:
        return null;
    }
  } catch (error) {
    console.warn("Failed to load compatibility provider:", error);
    return null;
  }
}
var McpToolCompatibility;
var init_tool_compatibility = __esm({
  "src/tool-compatibility/index.ts"() {
    "use strict";
    McpToolCompatibility = class {
      modelInfo;
      constructor(modelInfo2) {
        this.modelInfo = modelInfo2;
      }
      // Transform a complete tool schema
      transformToolSchema(toolSchema) {
        if (!this.shouldApply()) {
          return toolSchema;
        }
        return this.processSchema(toolSchema);
      }
      // Process any JSON schema recursively
      processSchema(schema) {
        const processed = { ...schema };
        switch (processed.type) {
          case "string":
            return this.processStringSchema(processed);
          case "number":
          case "integer":
            return this.processNumberSchema(processed);
          case "array":
            return this.processArraySchema(processed);
          case "object":
            return this.processObjectSchema(processed);
          default:
            return this.processGenericSchema(processed);
        }
      }
      // String schema processing
      processStringSchema(schema) {
        const constraints = {};
        const processed = { ...schema };
        if (typeof schema.minLength === "number") {
          constraints.minLength = schema.minLength;
        }
        if (typeof schema.maxLength === "number") {
          constraints.maxLength = schema.maxLength;
        }
        if (typeof schema.pattern === "string") {
          constraints.pattern = schema.pattern;
        }
        if (typeof schema.format === "string") {
          constraints.format = schema.format;
        }
        if (Array.isArray(schema.enum)) {
          constraints.enum = schema.enum;
        }
        const unsupportedProps = this.getUnsupportedStringProperties();
        for (const prop of unsupportedProps) {
          if (prop in processed) {
            delete processed[prop];
          }
        }
        if (Object.keys(constraints).length > 0) {
          processed.description = this.mergeDescription(schema.description, constraints);
        }
        return processed;
      }
      // Number schema processing
      processNumberSchema(schema) {
        const constraints = {};
        const processed = { ...schema };
        if (typeof schema.minimum === "number") {
          constraints.minimum = schema.minimum;
        }
        if (typeof schema.maximum === "number") {
          constraints.maximum = schema.maximum;
        }
        if (typeof schema.exclusiveMinimum === "number") {
          constraints.exclusiveMinimum = schema.exclusiveMinimum;
        }
        if (typeof schema.exclusiveMaximum === "number") {
          constraints.exclusiveMaximum = schema.exclusiveMaximum;
        }
        if (typeof schema.multipleOf === "number") {
          constraints.multipleOf = schema.multipleOf;
        }
        const unsupportedProps = this.getUnsupportedNumberProperties();
        for (const prop of unsupportedProps) {
          if (prop in processed) {
            delete processed[prop];
          }
        }
        if (Object.keys(constraints).length > 0) {
          processed.description = this.mergeDescription(schema.description, constraints);
        }
        return processed;
      }
      // Array schema processing
      processArraySchema(schema) {
        const constraints = {};
        const processed = { ...schema };
        if (typeof schema.minItems === "number") {
          constraints.minItems = schema.minItems;
        }
        if (typeof schema.maxItems === "number") {
          constraints.maxItems = schema.maxItems;
        }
        if (typeof schema.uniqueItems === "boolean") {
          constraints.uniqueItems = schema.uniqueItems;
        }
        if (schema.items && typeof schema.items === "object" && !Array.isArray(schema.items)) {
          processed.items = this.processSchema(schema.items);
        }
        const unsupportedProps = this.getUnsupportedArrayProperties();
        for (const prop of unsupportedProps) {
          if (prop in processed) {
            delete processed[prop];
          }
        }
        if (Object.keys(constraints).length > 0) {
          processed.description = this.mergeDescription(schema.description, constraints);
        }
        return processed;
      }
      // Object schema processing
      processObjectSchema(schema) {
        const constraints = {};
        const processed = { ...schema };
        if (typeof schema.minProperties === "number") {
          constraints.minProperties = schema.minProperties;
        }
        if (typeof schema.maxProperties === "number") {
          constraints.maxProperties = schema.maxProperties;
        }
        if (typeof schema.additionalProperties === "boolean") {
          constraints.additionalProperties = schema.additionalProperties;
        }
        if (schema.properties && typeof schema.properties === "object") {
          processed.properties = {};
          for (const [key, prop] of Object.entries(schema.properties)) {
            if (typeof prop === "object" && !Array.isArray(prop)) {
              processed.properties[key] = this.processSchema(prop);
            } else {
              processed.properties[key] = prop;
            }
          }
        }
        const unsupportedProps = this.getUnsupportedObjectProperties();
        for (const prop of unsupportedProps) {
          if (prop in processed) {
            delete processed[prop];
          }
        }
        if (Object.keys(constraints).length > 0) {
          processed.description = this.mergeDescription(schema.description, constraints);
        }
        return processed;
      }
      // Generic schema processing (for union types, etc.)
      processGenericSchema(schema) {
        const processed = { ...schema };
        if (Array.isArray(schema.oneOf)) {
          processed.oneOf = schema.oneOf.map((s) => typeof s === "object" ? this.processSchema(s) : s);
        }
        if (Array.isArray(schema.anyOf)) {
          processed.anyOf = schema.anyOf.map((s) => typeof s === "object" ? this.processSchema(s) : s);
        }
        if (Array.isArray(schema.allOf)) {
          processed.allOf = schema.allOf.map((s) => typeof s === "object" ? this.processSchema(s) : s);
        }
        return processed;
      }
      // Merge constraints into description
      mergeDescription(originalDescription, constraints) {
        const constraintJson = JSON.stringify(constraints);
        if (originalDescription) {
          return `${originalDescription}
${constraintJson}`;
        }
        return constraintJson;
      }
    };
  }
});

// src/index.ts
import "@elizaos/core";

// src/service.ts
import { Service, logger as logger2 } from "@elizaos/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// src/types.ts
var MCP_SERVICE_NAME = "mcp";
var DEFAULT_MCP_TIMEOUT_SECONDS = 6e4;
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

// src/utils/mcp.ts
import {
  ModelType,
  logger
} from "@elizaos/core";

// src/utils/json.ts
import Ajv from "ajv";
import JSON5 from "json5";
var ajv = new Ajv({
  allErrors: true,
  strict: false
});

// src/utils/mcp.ts
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

// src/service.ts
init_tool_compatibility();
var McpService = class extends Service {
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
  toolCompatibility = null;
  compatibilityInitialized = false;
  constructor(runtime2) {
    super(runtime2);
  }
  async initialize(runtime2) {
    this.runtime = runtime2;
    await this.start();
  }
  async start() {
    const settings = this.getMcpSettings();
    if (settings?.servers) {
      await this.updateServerConnections(settings.servers);
      const servers = this.getServers();
      this.mcpProvider = buildMcpProviderData(servers);
    } else {
      logger2.info("No MCP servers configured in character settings.");
    }
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
  getMcpSettings() {
    const settings = this.runtime.getSetting("mcp");
    if (!settings) return void 0;
    try {
      const parsedSettings = typeof settings === "string" ? JSON.parse(settings) : settings;
      return parsedSettings;
    } catch (error) {
      logger2.error("Failed to parse MCP settings:", error instanceof Error ? error.message : String(error));
      return void 0;
    }
  }
  async updateServerConnections(serverConfigs) {
    const currentNames = new Set(this.connections.keys());
    const newNames = new Set(Object.keys(serverConfigs));
    for (const name of currentNames) {
      if (!newNames.has(name)) {
        await this.deleteConnection(name);
        logger2.info(`Deleted MCP server: ${name}`);
      }
    }
    for (const [name, config] of Object.entries(serverConfigs)) {
      const currentConnection = this.connections.get(name);
      if (!currentConnection) {
        try {
          await this.initializeConnection(name, config);
        } catch (error) {
          logger2.error(
            `Failed to connect to new MCP server ${name}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      } else if (JSON.stringify(config) !== currentConnection.server.config) {
        try {
          await this.deleteConnection(name);
          await this.initializeConnection(name, config);
          logger2.info(`Reconnected MCP server with updated config: ${name}`);
        } catch (error) {
          logger2.error(
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
      const transport = config.type === "stdio" ? await this.buildStdioClientTransport(name, config) : await this.buildHttpClientTransport(name, config);
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
      logger2.info(`Successfully connected to MCP server: ${name}`);
    } catch (error) {
      state.status = "disconnected";
      state.lastError = error instanceof Error ? error : new Error(String(error));
      this.handleDisconnection(name, error);
      throw error;
    }
  }
  setupTransportHandlers(name, connection, state) {
    connection.transport.onerror = async (error) => {
      logger2.error(`Transport error for "${name}":`, error);
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
        logger2.warn(`Ping failed for ${name}:`, err instanceof Error ? err.message : String(err));
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
      logger2.warn(`Ping failures exceeded for ${name}, disconnecting and attempting reconnect.`);
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
      logger2.error(`Max reconnect attempts reached for ${name}. Giving up.`);
      return;
    }
    const delay = INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, state.reconnectAttempts);
    state.reconnectTimeout = setTimeout(async () => {
      state.reconnectAttempts++;
      logger2.info(`Attempting to reconnect to ${name} (attempt ${state.reconnectAttempts})...`);
      const config = this.connections.get(name)?.server.config;
      if (config) {
        try {
          await this.initializeConnection(name, JSON.parse(config));
        } catch (err) {
          logger2.error(`Reconnect attempt failed for ${name}:`, err instanceof Error ? err.message : String(err));
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
        logger2.error(
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
  async buildHttpClientTransport(name, config) {
    if (!config.url) {
      throw new Error(`Missing URL for HTTP MCP server ${name}`);
    }
    if (config.type === "sse") {
      logger2.warn(`Server "${name}": "sse" transport type is deprecated. Use "streamable-http" or "http" instead for the modern Streamable HTTP transport.`);
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
      const tools = (response?.tools || []).map((tool) => {
        let processedTool = { ...tool };
        if (tool.inputSchema) {
          try {
            if (!this.compatibilityInitialized) {
              this.initializeToolCompatibility();
            }
            processedTool.inputSchema = this.applyToolCompatibility(tool.inputSchema);
            logger2.debug(`Applied tool compatibility for: ${tool.name} on server: ${serverName}`);
          } catch (error) {
            logger2.warn(`Tool compatibility failed for ${tool.name} on ${serverName}:`, error);
          }
        }
        return processedTool;
      });
      logger2.info(`Fetched ${tools.length} tools for ${serverName}`);
      for (const tool of tools) {
        logger2.info(`[${serverName}] ${tool.name}: ${tool.description}`);
      }
      return tools;
    } catch (error) {
      logger2.error(
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
      logger2.warn(
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
      logger2.warn(
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
      logger2.error(
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
      logger2.info(`Restarting ${serverName} MCP server...`);
      connection.server.status = "connecting";
      connection.server.error = "";
      try {
        await this.deleteConnection(serverName);
        await this.initializeConnection(serverName, JSON.parse(config));
        logger2.info(`${serverName} MCP server connected`);
      } catch (error) {
        logger2.error(
          `Failed to restart connection for ${serverName}:`,
          error instanceof Error ? error.message : String(error)
        );
        throw new Error(`Failed to connect to ${serverName} MCP server`);
      }
    }
  }
  initializeToolCompatibility() {
    if (this.compatibilityInitialized) return;
    this.toolCompatibility = createMcpToolCompatibilitySync(this.runtime);
    this.compatibilityInitialized = true;
    if (this.toolCompatibility) {
      logger2.info(`Tool compatibility enabled`);
    } else {
      logger2.info(`No tool compatibility needed`);
    }
  }
  applyToolCompatibility(toolSchema) {
    if (!this.compatibilityInitialized) {
      this.initializeToolCompatibility();
    }
    if (!this.toolCompatibility || !toolSchema) {
      return toolSchema;
    }
    try {
      return this.toolCompatibility.transformToolSchema(toolSchema);
    } catch (error) {
      logger2.warn(`Tool compatibility transformation failed:`, error);
      return toolSchema;
    }
  }
};

// src/index.ts
var mcpPlugin = {
  name: "@elizaos/plugin-mcp",
  description: "Plugin for connecting to MCP (Model Context Protocol) servers",
  services: [McpService],
  init: async (_config, runtime2) => {
    runtime2.registerService(McpService);
  }
};
var index_default = mcpPlugin;
export {
  index_default as default
};
