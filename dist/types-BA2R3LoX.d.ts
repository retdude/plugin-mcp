import { Tool, Resource, ResourceTemplate } from '@modelcontextprotocol/sdk/types.js';

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

export type { McpProvider as M, McpServer as a };
