import {
  describe,
  expect,
  it,
} from "vitest";

import {
  checkInvoiceGst,
} from "../src/gst.js";

function taxableInvoice() {
  return {
    currency: "AUD",
    items: [
      {
        description: 
          "Professional services",
        quantity: 1,
        line_total: 500,
        taxable: true,
      },
    ],
    subtotal: 500,
    gst: 50,
    total: 550,
    gst_included: false,
  };
}

function codes(result) {
  return result.findings.map(
    (entry) => entry.code
  );
}

describe(
  "checkInvoiceGst",
  () => {
    it(
      "accepts correct GST-exclusive arithmetic",
      () => {
        const result =
          checkInvoiceGst(
            taxableInvoice()
          );

        expect(result.result).toBe(
          "gst_math_valid"
        );

        expect(
          result.calculated
            .expected_gst
        ).toBe(50);

        expect(
          result.calculated
            .expected_total
        ).toBe(550);

        expect(
          result.calculated
            .line_total_sum
        ).toBe(500);

        expect(
          result.findings
        ).toEqual([]);
      }
    );

    it(
      "detects a GST amount mismatch",
      () => {
        const invoice =
          taxableInvoice();

        invoice.gst = 75;
        invoice.total = 575;

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "gst_math_mismatch"
        );

        expect(codes(result)).toContain(
          "GST_MATH_MISMATCH"
        );
      }
    );

    it(
      "detects a total arithmetic mismatch",
      () => {
        const invoice =
          taxableInvoice();

        invoice.total = 600;

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "gst_math_mismatch"
        );

        expect(codes(result)).toContain(
          "TOTAL_MATH_MISMATCH"
        );
      }
    );

    it(
      "detects GST-exclusive line-total mismatch",
      () => {
        const invoice =
          taxableInvoice();

        invoice.items[0].line_total =
          400;

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "gst_math_mismatch"
        );

        expect(codes(result)).toContain(
          "LINE_TOTAL_MISMATCH"
        );
      }
    );

    it(
      "accepts correct GST-inclusive arithmetic",
      () => {
        const invoice =
          taxableInvoice();

        invoice.items[0].line_total =
          110;

        invoice.subtotal = 100;
        invoice.gst = 10;
        invoice.total = 110;
        invoice.gst_included = true;

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "gst_math_valid"
        );

        expect(
          result.calculated
            .expected_gst
        ).toBe(10);

        expect(
          result.calculated
            .line_total_sum
        ).toBe(110);
      }
    );

    it(
      "detects GST-inclusive line-total mismatch",
      () => {
        const invoice =
          taxableInvoice();

        invoice.items[0].line_total =
          100;

        invoice.subtotal = 100;
        invoice.gst = 10;
        invoice.total = 110;
        invoice.gst_included = true;

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "gst_math_mismatch"
        );

        expect(codes(result)).toContain(
          "LINE_TOTAL_MISMATCH"
        );
      }
    );

    it(
      "allows one-cent GST rounding tolerance",
      () => {
        const invoice =
          taxableInvoice();

        invoice.gst = 50.01;
        invoice.total = 550.01;

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "gst_math_valid"
        );
      }
    );

    it(
      "rejects mixed taxable and GST-free items",
      () => {
        const invoice =
          taxableInvoice();

        invoice.items = [
          {
            description:
              "Taxable service",
            line_total: 100,
            taxable: true,
          },
          {
            description:
              "GST-free item",
            line_total: 100,
            taxable: false,
          },
        ];

        invoice.subtotal = 200;
        invoice.gst = 10;
        invoice.total = 210;

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "unsupported_scenario"
        );

        expect(codes(result)).toContain(
          "UNSUPPORTED_GST_SCENARIO"
        );
      }
    );

    it(
      "accepts a wholly GST-free invoice",
      () => {
        const invoice =
          taxableInvoice();

        invoice.items[0].taxable =
          false;

        invoice.gst = 0;
        invoice.total = 500;

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "gst_math_valid"
        );

        expect(
          result.calculated.expected_gst
        ).toBe(0);

        expect(
          result.findings
        ).toEqual([]);
      }
    );

    it(
      "requires gst_included instead of guessing",
      () => {
        const invoice =
          taxableInvoice();

        delete invoice.gst_included;

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "needs_review"
        );

        expect(codes(result)).toContain(
          "GST_INCLUDED_MISSING"
        );
      }
    );

    it(
      "rejects unsupported currency",
      () => {
        const invoice =
          taxableInvoice();

        invoice.currency = "USD";

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "unsupported_scenario"
        );

        expect(codes(result)).toContain(
          "CURRENCY_UNSUPPORTED"
        );
      }
    );

    it.each([
      [
        "subtotal",
        "SUBTOTAL_MISSING",
      ],
      [
        "gst",
        "GST_MISSING",
      ],
      [
        "total",
        "TOTAL_MISSING",
      ],
    ])(
      "returns needs_review when %s is unavailable",
      (field, code) => {
        const invoice =
          taxableInvoice();

        delete invoice[field];

        const result =
          checkInvoiceGst(invoice);

        expect(result.result).toBe(
          "needs_review"
        );

        expect(codes(result)).toContain(
          code
        );
      }
    );
  }
);
