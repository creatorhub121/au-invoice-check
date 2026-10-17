import {
  describe,
  expect,
  it,
} from "vitest";

import worker from "../src/index.js";

describe(
  "AU Invoice Check worker",
  () => {
    it(
      "returns root metadata",
      async () => {
        const response =
          await worker.fetch(
            new Request(
              "https://example.test/"
            ),
            {},
            {}
          );

        expect(
          response.status
        ).toBe(200);

        const body =
          await response.json();

        expect(body.name).toBe(
          "AU Invoice Check"
        );

        expect(body.version).toBe(
          "0.1.0"
        );

        expect(body.status).toBe(
          "development"
        );

        expect(body.mcp).toBe(
          "/mcp"
        );

        expect(
          body.mcp_tools
        ).toEqual([
          "validate_tax_invoice",
        ]);
      }
    );

    it(
      "returns a healthy health endpoint",
      async () => {
        const response =
          await worker.fetch(
            new Request(
              "https://example.test/health"
            ),
            {},
            {}
          );

        expect(
          response.status
        ).toBe(200);

        const body =
          await response.json();

        expect(body).toEqual({
          ok: true,
          service:
            "au-invoice-check",
          status: "healthy",
        });
      }
    );

    it(
      "returns 404 for unknown routes",
      async () => {
        const response =
          await worker.fetch(
            new Request(
              "https://example.test/unknown"
            ),
            {},
            {}
          );

        expect(
          response.status
        ).toBe(404);
      }
    );
  }
);
