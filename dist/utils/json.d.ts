declare function parseJSON<T>(input: string): T;
declare function validateJsonSchema<T = unknown>(data: unknown, schema: Record<string, unknown>): {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};

export { parseJSON, validateJsonSchema };
