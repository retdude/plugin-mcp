import { State } from '@elizaos/core';

interface ToolSelection {
    serverName: string;
    toolName: string;
    arguments: Record<string, unknown>;
    reasoning?: string;
    noToolAvailable?: boolean;
}
interface ResourceSelection {
    serverName: string;
    uri: string;
    reasoning?: string;
    noResourceAvailable?: boolean;
}
declare function validateToolSelection(selection: unknown, composedState: State): {
    success: true;
    data: ToolSelection;
} | {
    success: false;
    error: string;
};
declare function validateResourceSelection(selection: unknown): {
    success: true;
    data: ResourceSelection;
} | {
    success: false;
    error: string;
};
declare function createToolSelectionFeedbackPrompt(originalResponse: string, errorMessage: string, composedState: State, userMessage: string): string;
declare function createResourceSelectionFeedbackPrompt(originalResponse: string, errorMessage: string, composedState: State, userMessage: string): string;

export { type ResourceSelection, type ToolSelection, createResourceSelectionFeedbackPrompt, createToolSelectionFeedbackPrompt, validateResourceSelection, validateToolSelection };
