import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validateTaxInvoice,
} from "../src/invoice.js";

function validInvoice() {
  return {
    supplier: {
      name: "Australian Taxation Office",
      abn: "51 824 753 556",
    },
    buyer: {},
    issue_date: "2026-10-14",
    document_intent: "tax_invoice",
    currency: "AUD",
    items: [
      {
        description: "Professional services",
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
  "validateTaxInvoice",
  () => {
    it(
      "accepts a supported invoice under $1,000 without buyer identity",
      () => {
        const result =
          validateTaxInvoice(
            validInvoice()
          );

        expect(result.result).toBe(
          "meets_core_requirements"
        );

        expect(
          result.threshold
            .buyer_identity_required
        ).toBe(false);

        expect(result.findings).toEqual(
          []
        );
      }
    );

    it(
      "requires buyer identity at exactly $1,000",
      () => {
        const invoice =
          validInvoice();

        invoice.subtotal =
          909.09;
        invoice.gst =
          90.91;
        invoice.total =
          1000;

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "missing_required_information"
        );

        expect(codes(result)).toContain(
          "BUYER_IDENTITY_REQUIRED"
        );

        expect(
          result.threshold
            .buyer_identity_required
        ).toBe(true);
      }
    );

    it(
      "accepts buyer name at exactly $1,000",
      () => {
        const invoice =
          validInvoice();

        invoice.subtotal =
          909.09;
        invoice.gst =
          90.91;
        invoice.total =
          1000;

        invoice.buyer = {
          name: "Example Buyer Pty Ltd",
        };

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "meets_core_requirements"
        );
      }
    );

    it(
      "reports a missing supplier ABN",
      () => {
        const invoice =
          validInvoice();

        delete invoice.supplier.abn;

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "missing_required_information"
        );

        expect(codes(result)).toContain(
          "SUPPLIER_ABN_MISSING"
        );
      }
    );

    it(
      "reports a missing issue date",
      () => {
        const invoice =
          validInvoice();

        delete invoice.issue_date;

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "missing_required_information"
        );

        expect(codes(result)).toContain(
          "ISSUE_DATE_MISSING"
        );
      }
    );

    it(
      "flags invalid issue-date format for review",
      () => {
        const invoice =
          validInvoice();

        invoice.issue_date =
          "14/10/2026";

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "needs_review"
        );

        expect(codes(result)).toContain(
          "ISSUE_DATE_INVALID"
        );
      }
    );

    it(
      "rejects unsupported currency",
      () => {
        const invoice =
          validInvoice();

        invoice.currency = "USD";

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "unsupported_scenario"
        );

        expect(codes(result)).toContain(
          "CURRENCY_UNSUPPORTED"
        );
      }
    );

    it(
      "reports missing invoice items",
      () => {
        const invoice =
          validInvoice();

        invoice.items = [];

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "missing_required_information"
        );

        expect(codes(result)).toContain(
          "ITEMS_MISSING"
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
      "reports missing %s",
      (field, code) => {
        const invoice =
          validInvoice();

        delete invoice[field];

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "missing_required_information"
        );

        expect(codes(result)).toContain(
          code
        );
      }
    );

    it(
      "rejects unsupported document intent",
      () => {
        const invoice =
          validInvoice();

        invoice.document_intent =
          "receipt";

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "unsupported_scenario"
        );

        expect(codes(result)).toContain(
          "DOCUMENT_INTENT_UNSUPPORTED"
        );
      }
    );

    it(
      "reports missing item information",
      () => {
        const invoice =
          validInvoice();

        invoice.items = [{}];

        const result =
          validateTaxInvoice(invoice);

        expect(result.result).toBe(
          "missing_required_information"
        );

        expect(codes(result)).toEqual(
          expect.arrayContaining([
            "ITEM_DESCRIPTION_MISSING",
            "ITEM_PRICE_MISSING",
            "TAXABLE_STATUS_MISSING",
          ])
        );
      }
    );
  }
);
