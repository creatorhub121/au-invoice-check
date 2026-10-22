const SCHEMA_VERSION = "0.1";
const TOLERANCE = 0.01;

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isMoney(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function roundMoney(value) {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}

function withinTolerance(
  actual,
  expected
) {
  return (
    Math.abs(actual - expected) <=
    TOLERANCE + Number.EPSILON
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

export function checkInvoiceGst(
  input = {}
) {
  const invoice = isObject(input)
    ? input
    : {};

  const findings = [];

  let unsupported = false;
  let needsReview = false;
  let mismatch = false;

  const currency =
    typeof invoice.currency === "string" &&
    invoice.currency.trim().length > 0
      ? invoice.currency
          .trim()
          .toUpperCase()
      : "AUD";

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

  const items = Array.isArray(
    invoice.items
  )
    ? invoice.items
    : [];

  if (items.length === 0) {
    findings.push(
      finding(
        "ITEMS_MISSING",
        "warning",
        "items",
        "At least one invoice item is required for GST reconciliation."
      )
    );

    needsReview = true;
  }

  const lineTotals = [];
  const taxableStatuses = [];

  items.forEach((item, index) => {
    const value = isObject(item)
      ? item
      : {};

    if (isMoney(value.line_total)) {
      lineTotals.push(
        value.line_total
      );
    } else {
      findings.push(
        finding(
          "ITEM_PRICE_MISSING",
          "warning",
          `items[${index}].line_total`,
          "Invoice item line total is required for GST reconciliation."
        )
      );

      needsReview = true;
    }

    if (
      typeof value.taxable ===
      "boolean"
    ) {
      taxableStatuses.push(
        value.taxable
      );
    } else {
      findings.push(
        finding(
          "TAXABLE_STATUS_MISSING",
          "warning",
          `items[${index}].taxable`,
          "Invoice item taxable status is required for GST checking."
        )
      );

      needsReview = true;
    }
  });

  let taxTreatment = null;

  if (
    items.length > 0 &&
    taxableStatuses.length ===
      items.length
  ) {
    const allTaxable =
      taxableStatuses.every(
        (value) => value === true
      );

    const allGstFree =
      taxableStatuses.every(
        (value) => value === false
      );

    if (allTaxable) {
      taxTreatment = "taxable";
    } else if (allGstFree) {
      taxTreatment = "gst_free";
    } else {
      findings.push(
        finding(
          "UNSUPPORTED_GST_SCENARIO",
          "warning",
          "items",
          "v0.1 does not support invoices containing a mixture of taxable and GST-free supplies."
        )
      );

      unsupported = true;
    }
  }

  const supplied = {
    subtotal: isMoney(
      invoice.subtotal
    )
      ? invoice.subtotal
      : null,

    gst: isMoney(invoice.gst)
      ? invoice.gst
      : null,

    total: isMoney(invoice.total)
      ? invoice.total
      : null,

    gst_included:
      typeof invoice.gst_included ===
      "boolean"
        ? invoice.gst_included
        : null,
  };

  if (supplied.subtotal === null) {
    findings.push(
      finding(
        "SUBTOTAL_MISSING",
        "warning",
        "subtotal",
        "Invoice subtotal is required for GST checking."
      )
    );

    needsReview = true;
  }

  if (supplied.gst === null) {
    findings.push(
      finding(
        "GST_MISSING",
        "warning",
        "gst",
        "Invoice GST amount is required for GST checking."
      )
    );

    needsReview = true;
  }

  if (supplied.total === null) {
    findings.push(
      finding(
        "TOTAL_MISSING",
        "warning",
        "total",
        "Invoice total is required for GST checking."
      )
    );

    needsReview = true;
  }

  if (
    supplied.gst_included === null
  ) {
    findings.push(
      finding(
        "GST_INCLUDED_MISSING",
        "warning",
        "gst_included",
        "gst_included is required to interpret item line totals."
      )
    );

    needsReview = true;
  }

  let lineTotalSum = null;
  let expectedGst = null;
  let expectedTotal = null;

  const hasAllLineTotals =
    items.length > 0 &&
    lineTotals.length ===
      items.length;

  const hasMoney =
    supplied.subtotal !== null &&
    supplied.gst !== null &&
    supplied.total !== null;

  const canCalculate =
    !unsupported &&
    hasAllLineTotals &&
    hasMoney &&
    supplied.gst_included !== null &&
    taxableStatuses.length ===
      items.length;

  if (canCalculate) {
    lineTotalSum = roundMoney(
      lineTotals.reduce(
        (sum, value) =>
          sum + value,
        0
      )
    );

    const expectedLineBase =
      supplied.gst_included
        ? supplied.total
        : supplied.subtotal;

    if (
      !withinTolerance(
        lineTotalSum,
        expectedLineBase
      )
    ) {
      findings.push(
        finding(
          "LINE_TOTAL_MISMATCH",
          "error",
          "items",
          supplied.gst_included
            ? "Invoice item line totals do not reconcile to the supplied GST-inclusive total."
            : "Invoice item line totals do not reconcile to the supplied subtotal."
        )
      );

      mismatch = true;
    }

    expectedGst =
      taxTreatment === "gst_free"
        ? 0
        : roundMoney(
            supplied.gst_included
              ? supplied.total / 11
              : supplied.subtotal * 0.1
          );

    if (
      !withinTolerance(
        supplied.gst,
        expectedGst
      )
    ) {
      findings.push(
        finding(
          "GST_MATH_MISMATCH",
          "error",
          "gst",
          "Supplied GST does not match the expected standard GST amount within the supported one-cent tolerance."
        )
      );

      mismatch = true;
    }

    expectedTotal = roundMoney(
      supplied.subtotal +
        supplied.gst
    );

    if (
      !withinTolerance(
        supplied.total,
        expectedTotal
      )
    ) {
      findings.push(
        finding(
          "TOTAL_MATH_MISMATCH",
          "error",
          "total",
          "Supplied subtotal plus GST does not reconcile to the supplied total within the supported one-cent tolerance."
        )
      );

      mismatch = true;
    }
  }

  let result = "gst_math_valid";

  if (unsupported) {
    result =
      "unsupported_scenario";
  } else if (needsReview) {
    result = "needs_review";
  } else if (mismatch) {
    result =
      "gst_math_mismatch";
  }

  return {
    schema_version: SCHEMA_VERSION,
    tool: "check_invoice_gst",
    result,
    calculated: {
      expected_gst:
        expectedGst,
      expected_total:
        expectedTotal,
      line_total_sum:
        lineTotalSum,
    },
    supplied,
    findings,
  };
}
