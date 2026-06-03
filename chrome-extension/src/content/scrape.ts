import type { CaseContext } from "../utils/resolver";

/**
 * Best-effort scrape of the SFDC Lightning case page DOM.
 *
 * Lightning markup is volatile, so we try several strategies per field and fall
 * back gracefully. Kept as a pure `(Document) => CaseContext` function so it can
 * be unit-tested against fixture DOMs without a live Salesforce page.
 */
export function scrapeCaseContext(doc: Document = document): CaseContext {
  const caseNumber = firstNonEmpty([
    () => byFieldName(doc, "Case.CaseNumber"),
    () => byOutputLabel(doc, "Case Number"),
    () => fromHighlightsTitle(doc, /case\s*#?\s*([0-9]{5,})/i),
  ]);

  const customerFullName = firstNonEmpty([
    () => byFieldName(doc, "Case.Contact"),
    () => byFieldName(doc, "Case.ContactId"),
    () => byOutputLabel(doc, "Contact Name"),
    () => byOutputLabel(doc, "Contact"),
  ]);

  const context: CaseContext = {};
  if (caseNumber) context.caseNumber = caseNumber;
  if (customerFullName) {
    context.customerFullName = customerFullName;
    context.customerFirstName = customerFullName.trim().split(/\s+/)[0];
  }
  return context;
}

function firstNonEmpty(strategies: Array<() => string | undefined>): string | undefined {
  for (const strategy of strategies) {
    const value = strategy()?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Lightning record fields expose `data-target-selection-name="sfdc:RecordField.<Field>"`. */
function byFieldName(doc: Document, field: string): string | undefined {
  const el = doc.querySelector(
    `[data-target-selection-name$="${field}"], [data-target-selection-name$="${field}"] *`,
  );
  return el ? text(el.closest("[data-target-selection-name]") ?? el) : undefined;
}

/** Find a field by its visible label, then read the adjacent value. */
function byOutputLabel(doc: Document, label: string): string | undefined {
  const items = Array.from(doc.querySelectorAll("force-record-layout-item, .slds-form-element"));
  for (const item of items) {
    const labelEl = item.querySelector(".slds-form-element__label, .test-id__field-label");
    if (labelEl && text(labelEl).toLowerCase() === label.toLowerCase()) {
      const valueEl =
        item.querySelector(".slds-form-element__control, .test-id__field-value") ?? item;
      const value = text(valueEl);
      if (value && value.toLowerCase() !== label.toLowerCase()) return value;
    }
  }
  return undefined;
}

/** The highlights panel title often contains the case number. */
function fromHighlightsTitle(doc: Document, re: RegExp): string | undefined {
  const title = doc.querySelector(
    ".slds-page-header__title, records-highlights2 .entityNameTitle",
  );
  const match = title ? text(title).match(re) : null;
  return match?.[1];
}

function text(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}
