import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function createServer() {
  return new McpServer({
    name: "AU Invoice Check",
    version: "0.1.0",
  });
}

function jsonResponse(data, status = 200) {
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
        mcp_tools: [],
      });
    }

    if (url.pathname === "/mcp") {
      const mcpHandler = createMcpHandler(
        () => createServer(env)
      );

      return mcpHandler(request, env, ctx);
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
