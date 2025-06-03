// src/utils/json.ts
import Ajv from "ajv";
import JSON5 from "json5";
function parseJSON(input) {
  const cleanedInput = input.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  return JSON5.parse(cleanedInput);
}
var ajv = new Ajv({
  allErrors: true,
  strict: false
});
function validateJsonSchema(data, schema) {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      const errors = (validate.errors || []).map((err) => {
        const path = err.instancePath ? `${err.instancePath.replace(/^\//, "")}` : "value";
        return `${path}: ${err.message}`;
      });
      return { success: false, error: errors.join(", ") };
    }
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Schema validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export {
  parseJSON,
  validateJsonSchema
};
