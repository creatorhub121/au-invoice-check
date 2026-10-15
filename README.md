# AU Invoice Check

Deterministic Australian tax-invoice checks and supplier verification for AI agents and automated workflows.

Part of **AU Agent Utilities**.

## Status

v0.1 is currently under development.

## Planned MCP tools

- `validate_tax_invoice`
- `check_invoice_gst`
- `verify_invoice_supplier`
- `assess_tax_invoice`

## v0.1 scope

AU Invoice Check is designed to assess structured Australian tax-invoice data using deterministic rules.

The initial version will focus on:

- core tax-invoice information checks
- GST arithmetic
- invoice total reconciliation
- ABN validation
- live supplier verification
- available GST registration information
- structured findings for AI agents and automated workflows

## Design documents

- `docs/v0.1-spec.md`
- `docs/v0.1-test-plan.md`

## Project principles

The tool will not claim that an invoice is legally compliant, ATO approved, illegal, or fraudulent. 

Unsupported or ambiguous scenarios will be returned for review rather than guessed.
