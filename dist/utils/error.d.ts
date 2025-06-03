import { State, IAgentRuntime, Memory, HandlerCallback } from '@elizaos/core';
import { M as McpProvider } from '../types-BA2R3LoX.js';
import '@modelcontextprotocol/sdk/types.js';

declare function handleMcpError(state: State, mcpProvider: McpProvider, error: unknown, runtime: IAgentRuntime, message: Memory, type: "tool" | "resource", callback?: HandlerCallback): Promise<boolean>;
declare class McpError extends Error {
    readonly code: string;
    constructor(message: string, code?: string);
    static connectionError(serverName: string, details?: string): McpError;
    static toolNotFound(toolName: string, serverName: string): McpError;
    static resourceNotFound(uri: string, serverName: string): McpError;
    static validationError(details: string): McpError;
    static serverError(serverName: string, details?: string): McpError;
}

export { McpError, handleMcpError };
