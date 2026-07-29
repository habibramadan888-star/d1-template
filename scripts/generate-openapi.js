const fs = require("node:fs");
const path = require("node:path");

const standardSuccess = (schema) => ({
  type: "object",
  required: ["code", "message", "data"],
  properties: {
    code: { type: "integer", enum: [0] },
    message: { type: "string", example: "success" },
    data: schema
  }
});

const standardError = {
  type: "object",
  required: ["code", "message"],
  properties: {
    code: { type: "integer", example: 1001 },
    message: { type: "string" },
    error: { type: "string" }
  }
};

const jsonResponse = (schema, description = "OK") => ({
  description,
  content: {
    "application/json": {
      schema
    }
  }
});

const stringMap = {
  type: "object",
  additionalProperties: { type: "string" }
};

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Homelink Finance Worker API",
    version: "2.0.0",
    description:
      "Production-readiness OpenAPI baseline covering the standardized response contract and core Worker endpoints."
  },
  servers: [
    { url: "http://127.0.0.1:8787", description: "Local Wrangler dev" },
    {
      url: "https://homelink-finance.habibramadan888.workers.dev",
      description: "Production Worker"
    }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "sid"
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer"
      }
    },
    schemas: {
      StandardError: standardError,
      Me: {
        type: "object",
        required: ["userid", "role", "canWrite"],
        properties: {
          userid: { type: "string" },
          username: { type: "string" },
          employee_id: { type: "string" },
          display_name: { type: "string" },
          employee_name: { type: "string" },
          corpid: { type: "string" },
          role: { type: "string" },
          isManager: { type: "boolean" },
          isReadonlyAdmin: { type: "boolean" },
          canWrite: { type: "boolean" }
        }
      },
      ListEnvelope: {
        type: "object",
        additionalProperties: true
      },
      RentConfig: {
        type: "object",
        properties: {
          config: {
            type: "object",
            additionalProperties: { type: "number" }
          },
          updatedBy: { type: "string" },
          updatedAt: { type: "string" },
          readonly: { type: "boolean" }
        }
      },
      RentConfigUpdate: {
        type: "object",
        required: ["config"],
        properties: {
          config: {
            type: "object",
            additionalProperties: { type: "number" }
          }
        }
      }
    }
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  paths: {
    "/api/me": {
      get: {
        summary: "Get current authenticated user",
        responses: {
          200: jsonResponse(standardSuccess({ $ref: "#/components/schemas/Me" })),
          401: jsonResponse({ $ref: "#/components/schemas/StandardError" }, "Unauthenticated")
        }
      }
    },
    "/api/dashboard/totals": {
      get: {
        summary: "Get backend-authoritative dashboard totals",
        responses: {
          200: jsonResponse(
            standardSuccess({
              type: "object",
              additionalProperties: true
            })
          ),
          401: jsonResponse({ $ref: "#/components/schemas/StandardError" }, "Unauthenticated")
        }
      }
    },
    "/api/properties": {
      get: {
        summary: "List properties scoped to the authenticated user",
        responses: {
          200: jsonResponse(standardSuccess({ $ref: "#/components/schemas/ListEnvelope" }))
        }
      }
    },
    "/api/entries": {
      get: {
        summary: "List entries scoped to the authenticated user",
        responses: {
          200: jsonResponse(standardSuccess({ $ref: "#/components/schemas/ListEnvelope" }))
        }
      }
    },
    "/api/payments": {
      get: {
        summary: "List payments scoped to the authenticated user",
        responses: {
          200: jsonResponse(standardSuccess({ $ref: "#/components/schemas/ListEnvelope" }))
        }
      }
    },
    "/api/receivables": {
      get: {
        summary: "List receivables scoped to the authenticated user",
        responses: {
          200: jsonResponse(standardSuccess({ $ref: "#/components/schemas/ListEnvelope" }))
        }
      }
    },
    "/api/arrears": {
      get: {
        summary: "List arrears scoped to the authenticated user",
        responses: {
          200: jsonResponse(standardSuccess({ type: "array", items: { type: "object" } }))
        }
      }
    },
    "/api/history": {
      get: {
        summary: "List historical handover sessions",
        responses: {
          200: jsonResponse(standardSuccess({ type: "array", items: { type: "object" } }))
        }
      }
    },
    "/api/session_detail": {
      get: {
        summary: "Get session transaction details",
        parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          200: jsonResponse(standardSuccess({ type: "array", items: { type: "object" } }))
        }
      }
    },
    "/api/rent_config": {
      get: {
        summary: "Get rent reference configuration",
        responses: {
          200: jsonResponse(standardSuccess({ $ref: "#/components/schemas/RentConfig" }))
        }
      },
      post: {
        summary: "Update rent reference configuration",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RentConfigUpdate" }
            }
          }
        },
        responses: {
          200: jsonResponse(
            standardSuccess({ type: "object", properties: { success: { type: "boolean" } } })
          )
        }
      }
    },
    "/api/customers": {
      get: {
        summary: "Get customer credit data",
        responses: {
          200: jsonResponse(standardSuccess({ type: "object", additionalProperties: true }))
        }
      },
      post: {
        summary: "Save customer credit data",
        responses: {
          200: jsonResponse(standardSuccess({ type: "object", additionalProperties: true }))
        }
      }
    },
    "/api/wifi/accounts": {
      get: {
        summary: "Get Wi-Fi account metadata",
        responses: {
          200: jsonResponse(
            standardSuccess({ type: "object", properties: { accounts: stringMap } })
          )
        }
      },
      post: {
        summary: "Save Wi-Fi account metadata",
        responses: {
          200: jsonResponse(standardSuccess({ type: "object", additionalProperties: true }))
        }
      }
    }
  }
};

const outputPath = path.join(__dirname, "../docs/openapi.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(openapi, null, 2)}\n`);
console.log(`OpenAPI written: ${outputPath}`);
console.log(`OpenAPI paths: ${Object.keys(openapi.paths).length}`);
