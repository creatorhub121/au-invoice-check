import {
  createMcpHandler,
} from "agents/mcp/server";

import {
  McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import {
  validateTaxInvoice,
} from "./invoice.js";

function toolSuccess(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data),
      },
    ],
  };
}

function createServer() {
  const server = new McpServer({
    name: "AU Invoice Check",
    version: "0.1.0",
  });

  server.registerTool(
    "validate_tax_invoice",
    {
      description:
        "Check structured Australian tax-invoice data for the core information required within the supported v0.1 scope.",
      inputSchema: {
        supplier: z
          .object({
            name: z.string().optional(),
            abn: z.string().optional(),
          })
          .optional(),

        buyer: z
          .object({
            name: z.string().optional(),
            abn: z.string().optional(),
          })
          .optional(),

        issue_date: z
          .string()
          .optional(),

        document_intent: z
          .string()
          .optional(),

        currency: z
          .string()
          .optional(),

        items: z
          .array(
            z.object({
              description: z
                .string()
                .optional(),

              quantity: z
                .number()
                .nonnegative()
                .optional(),

              line_total: z
                .number()
                .nonnegative()
                .optional(),

              taxable: z
                .boolean()
                .optional(),
            })
          )
          .optional(),

        subtotal: z
          .number()
          .nonnegative()
          .optional(),

        gst: z
          .number()
          .nonnegative()
          .optional(),

        total: z
          .number()
          .nonnegative()
          .optional(),

        gst_included: z
          .boolean()
          .optional(),
      },
    },
    async (input) =>
      toolSuccess(
        validateTaxInvoice(input)
      )
  );

  return server;
}

function jsonResponse(
  data,
  status = 200
) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return jsonResponse({
        ok: true,
        service: "au-invoice-check",
        status: "healthy",
      });
    }

    if (url.pathname === "/") {
      return jsonResponse({
        name: "AU Invoice Check",
        version: "0.1.0",
        status: "development",
        description:
          "Australian tax-invoice validation and supplier verification for AI agents via MCP.",
        mcp: "/mcp",
        mcp_tools: [
          "validate_tax_invoice",
        ],
      });
    }

    if (url.pathname === "/mcp") {
      const mcpHandler =
        createMcpHandler(
          () => createServer(env)
        );

      return mcpHandler(
        request,
        env,
        ctx
      );
    }

    return jsonResponse(
      {
        ok: false,
        error: "Not found",
      },
      404
    );
  },
};
