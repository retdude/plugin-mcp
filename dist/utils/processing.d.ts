import { IAgentRuntime, Media, Memory, HandlerCallback, State } from '@elizaos/core';

declare function processResourceResult(result: {
    contents: Array<{
        uri: string;
        mimeType?: string;
        text?: string;
        blob?: string;
    }>;
}, uri: string): {
    resourceContent: string;
    resourceMeta: string;
};
declare function processToolResult(result: {
    content: Array<{
        type: string;
        text?: string;
        mimeType?: string;
        data?: string;
        resource?: {
            uri: string;
            text?: string;
            blob?: string;
        };
    }>;
    isError?: boolean;
}, serverName: string, toolName: string, runtime: IAgentRuntime, messageEntityId: string): {
    toolOutput: string;
    hasAttachments: boolean;
    attachments: Media[];
};
declare function handleResourceAnalysis(runtime: IAgentRuntime, message: Memory, uri: string, serverName: string, resourceContent: string, resourceMeta: string, callback?: HandlerCallback): Promise<void>;
declare function handleToolResponse(runtime: IAgentRuntime, message: Memory, serverName: string, toolName: string, toolArgs: Record<string, unknown>, toolOutput: string, hasAttachments: boolean, attachments: Media[], state: State, mcpProvider: {
    values: {
        mcp: unknown;
    };
    data: {
        mcp: unknown;
    };
    text: string;
}, callback?: HandlerCallback): Promise<void>;
declare function sendInitialResponse(callback?: HandlerCallback): Promise<void>;

export { handleResourceAnalysis, handleToolResponse, processResourceResult, processToolResult, sendInitialResponse };
