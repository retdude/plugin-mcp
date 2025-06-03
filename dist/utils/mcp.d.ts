import { IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { a as McpServer, M as McpProvider } from '../types-BA2R3LoX.js';
import '@modelcontextprotocol/sdk/types.js';

declare function withModelRetry<T>(initialInput: string, runtime: IAgentRuntime, validationFn: (data: unknown) => {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
}, message: Memory, composedState: State, createFeedbackPromptFn: (originalResponse: string, errorMessage: string, composedState: State, userMessage: string) => string, callback?: HandlerCallback, failureMsg?: string, retryCount?: number): Promise<T | null>;
declare function getMaxRetries(runtime: IAgentRuntime): number;
declare function handleNoSelectionAvailable<T>(selection: T & {
    noToolAvailable?: boolean;
    noResourceAvailable?: boolean;
}, callback?: HandlerCallback, message?: string): Promise<boolean>;
declare function createMcpMemory(runtime: IAgentRuntime, message: Memory, type: string, serverName: string, content: string, metadata: Record<string, unknown>): Promise<void>;
declare function buildMcpProviderData(servers: McpServer[]): McpProvider;

export { buildMcpProviderData, createMcpMemory, getMaxRetries, handleNoSelectionAvailable, withModelRetry };
