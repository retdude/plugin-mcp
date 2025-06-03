// src/types.ts
var MCP_SERVICE_NAME = "mcp";
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

export {
  MCP_SERVICE_NAME,
  DEFAULT_MAX_RETRIES,
  ToolSelectionSchema,
  ResourceSelectionSchema
};
