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
  constructor(runtime) {
    super(runtime);
  }
  async initialize(runtime) {
    this.runtime = runtime;
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
};

// src/index.ts
var mcpPlugin = {
  name: "@elizaos/plugin-mcp",
  description: "Plugin for connecting to MCP (Model Context Protocol) servers",
  services: [McpService],
  init: async (_config, runtime) => {
    const service = new McpService(runtime);
    await service.initialize(runtime);
  }
};
var index_default = mcpPlugin;
export {
  index_default as default
};
