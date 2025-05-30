import { Service, IAgentRuntime, Plugin } from '@elizaos/core';
import { Tool, Resource, ResourceTemplate, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

type McpServerStatus = "connecting" | "connected" | "disconnected";
interface McpServer {
    name: string;
    status: McpServerStatus;
    config: string;
    error?: string;
    disabled?: boolean;
    tools?: Tool[];
    resources?: Resource[];
    resourceTemplates?: ResourceTemplate[];
}
interface McpResourceResponse {
    contents: Array<{
        uri: string;
        mimeType?: string;
        text?: string;
        blob?: string;
    }>;
}
interface McpToolInfo {
    description: string;
    inputSchema?: {
        properties?: Record<string, unknown>;
        required?: string[];
        [key: string]: unknown;
    };
}
interface McpResourceInfo {
    name: string;
    description: string;
    mimeType?: string;
}
interface McpServerInfo {
    status: string;
    tools: Record<string, McpToolInfo>;
    resources: Record<string, McpResourceInfo>;
}
type McpProvider = {
    values: {
        mcp: McpProviderData;
    };
    data: {
        mcp: McpProviderData;
    };
    text: string;
};
interface McpProviderData {
    [serverName: string]: McpServerInfo;
}

declare class McpService extends Service {
    static serviceType: string;
    capabilityDescription: string;
    private connections;
    private connectionStates;
    private mcpProvider;
    private pingConfig;
    constructor(runtime: IAgentRuntime);
    initialize(runtime: IAgentRuntime): Promise<void>;
    static start(runtime: IAgentRuntime): Promise<McpService>;
    stop(): Promise<void>;
    private initializeMcpServers;
    private getMcpSettings;
    private updateServerConnections;
    private initializeConnection;
    private setupTransportHandlers;
    private startPingMonitoring;
    private sendPing;
    private handlePingFailure;
    private handleDisconnection;
    deleteConnection(name: string): Promise<void>;
    private getServerConnection;
    private buildStdioClientTransport;
    private buildSseClientTransport;
    private appendErrorMessage;
    private fetchToolsList;
    private fetchResourcesList;
    private fetchResourceTemplatesList;
    getServers(): McpServer[];
    getProviderData(): McpProvider;
    callTool(serverName: string, toolName: string, toolArguments?: Record<string, unknown>): Promise<CallToolResult>;
    readResource(serverName: string, uri: string): Promise<McpResourceResponse>;
    restartConnection(serverName: string): Promise<void>;
}

declare const mcpPlugin: Plugin;

export { McpService, mcpPlugin as default };
