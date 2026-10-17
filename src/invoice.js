const SCHEMA_VERSION = "0.1";

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isBlank(value) {
  return (
    typeof value !== "string" ||
    value.trim().length === 0
  );
}

function isMoney(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function isValidIsoDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function finding(
  code,
  severity,
  field,
  message
) {
  return {
    code,
    severity,
    field,
    message,
  };
}

export function validateTaxInvoice(input = {}) {
  const invoice = isObject(input)
    ? input
    : {};

  const findings = [];
  let unsupported = false;
  let missingRequired = false;
  let needsReview = false;

  const supplier = isObject(invoice.supplier)
    ? invoice.supplier
    : {};

  if (isBlank(supplier.name)) {
    findings.push(
      finding(
        "SUPPLIER_NAME_MISSING",
        "error",
        "supplier.name",
        "Supplier identity is required."
      )
    );
    missingRequired = true;
  }

  if (isBlank(supplier.abn)) {
    findings.push(
      finding(
        "SUPPLIER_ABN_MISSING",
        "error",
        "supplier.abn",
        "Supplier ABN is required."
      )
    );
    missingRequired = true;
  }

  if (isBlank(invoice.document_intent)) {
    findings.push(
      finding(
        "DOCUMENT_INTENT_MISSING",
        "error",
        "document_intent",
        "Document intent is required."
      )
    );
    missingRequired = true;
  } else if (
    invoice.document_intent !== "tax_invoice"
  ) {
    findings.push(
      finding(
        "DOCUMENT_INTENT_UNSUPPORTED",
        "warning",
        "document_intent",
        "v0.1 supports tax_invoice only."
      )
    );
    unsupported = true;
  }

  if (isBlank(invoice.issue_date)) {
    findings.push(
      finding(
        "ISSUE_DATE_MISSING",
        "error",
        "issue_date",
        "Issue date is required."
      )
    );
    missingRequired = true;
  } else if (
    !isValidIsoDate(invoice.issue_date)
  ) {
    findings.push(
      finding(
        "ISSUE_DATE_INVALID",
        "warning",
        "issue_date",
        "Issue date must be a valid YYYY-MM-DD date."
      )
    );
    needsReview = true;
  }

  const currency = isBlank(invoice.currency)
    ? "AUD"
    : invoice.currency.trim().toUpperCase();

  if (currency !== "AUD") {
    findings.push(
      finding(
        "CURRENCY_UNSUPPORTED",
        "warning",
        "currency",
        "v0.1 supports AUD invoices only."
      )
    );
    unsupported = true;
  }

  const items = Array.isArray(invoice.items)
    ? invoice.items
    : [];

  if (items.length === 0) {
    findings.push(
      finding(
        "ITEMS_MISSING",
        "error",
        "items",
        "At least one invoice item is required."
      )
    );
    missingRequired = true;
  }

  items.forEach((item, index) => {
    const value = isObject(item)
      ? item
      : {};

    if (isBlank(value.description)) {
      findings.push(
        finding(
          "ITEM_DESCRIPTION_MISSING",
          "error",
          `items[${index}].description`,
          "Invoice item description is required."
        )
      );
      missingRequired = true;
    }

    if (!isMoney(value.line_total)) {
      findings.push(
        finding(
          "ITEM_PRICE_MISSING",
          "error",
          `items[${index}].line_total`,
          "Invoice item line total is required."
        )
      );
      missingRequired = true;
    }

    if (typeof value.taxable !== "boolean") {
      findings.push(
        finding(
          "TAXABLE_STATUS_MISSING",
          "error",
          `items[${index}].taxable`,
          "Invoice item taxable status is required."
        )
      );
      missingRequired = true;
    }
  });

  if (!isMoney(invoice.subtotal)) {
    findings.push(
      finding(
        "SUBTOTAL_MISSING",
        "error",
        "subtotal",
        "Invoice subtotal is required."
      )
    );
    missingRequired = true;
  }

  if (!isMoney(invoice.gst)) {
    findings.push(
      finding(
        "GST_MISSING",
        "error",
        "gst",
        "Invoice GST amount is required."
      )
    );
    missingRequired = true;
  }

  if (!isMoney(invoice.total)) {
    findings.push(
      finding(
        "TOTAL_MISSING",
        "error",
        "total",
        "Invoice total is required."
      )
    );
    missingRequired = true;
  }

  const totalKnown = isMoney(invoice.total);

  const buyerIdentityRequired = totalKnown
    ? invoice.total >= 1000
    : null;

  const buyer = isObject(invoice.buyer)
    ? invoice.buyer
    : {};

  const buyerIdentityPresent =
    !isBlank(buyer.name) ||
    !isBlank(buyer.abn);

  if (
    buyerIdentityRequired === true &&
    !buyerIdentityPresent
  ) {
    findings.push(
      finding(
        "BUYER_IDENTITY_REQUIRED",
        "error",
        "buyer",
        "Buyer identity or ABN is required for a supported tax invoice of $1,000 or more including GST."
      )
    );
    missingRequired = true;
  }

  let result = "meets_core_requirements";

  if (unsupported) {
    result = "unsupported_scenario";
  } else if (missingRequired) {
    result = "missing_required_information";
  } else if (needsReview) {
    result = "needs_review";
  }

  return {
    schema_version: SCHEMA_VERSION,
    tool: "validate_tax_invoice",
    result,
    threshold: {
      total_including_gst: totalKnown
        ? invoice.total
        : null,
      buyer_identity_required:
        buyerIdentityRequired,
      buyer_identity_present:
        buyerIdentityPresent,
    },
    findings,
  };
}
