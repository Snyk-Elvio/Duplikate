import type { CaseContext } from "../utils/resolver";

/**
 * Best-effort scrape of the SFDC Lightning case page DOM.
 *
 * Lightning markup is volatile, so we try several strategies per field and fall
 * back gracefully. Kept as a pure `(Document) => CaseContext` function so it can
 * be unit-tested against fixture DOMs without a live Salesforce page.
 *
 * In Lightning Service Console, multiple case tabs coexist in the DOM — inactive
 * ones are hidden via aria-hidden, the slds-hide class, or the hidden attribute.
 * All query helpers skip elements inside hidden containers so a background tab
 * never contaminates the active case context.
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

// Returns true when the element is not visible to the user, so scrape results
// from inactive Service Console tabs don't bleed into the active context.
//
// checkVisibility() (Chrome 105+) consults the layout engine and returns false
// for display:none / visibility:hidden / slds-hide and any hidden ancestor —
// this covers every SFDC tab-hiding pattern without needing to guess class names.
// The aria-hidden tabpanel walk is kept as a fallback for aria-only hiding.
function isHiddenContent(el: Element): boolean {
  const html = el as HTMLElement;
  if (typeof html.checkVisibility === "function") {
    return !html.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
  }
  // Fallback: walk ancestors for aria-hidden tabpanels.
  let node: Element | null = el;
  while (node && node !== document.documentElement) {
    if (
      node.getAttribute("role") === "tabpanel" &&
      node.getAttribute("aria-hidden") === "true"
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
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
  const candidates = doc.querySelectorAll<Element>(
    `[data-target-selection-name$="${field}"]`,
  );
  for (const container of candidates) {
    if (!isHiddenContent(container)) {
      return fieldValue(container);
    }
  }
  return undefined;
}

/** Find a field by its visible label, then read the adjacent value. */
function byOutputLabel(doc: Document, label: string): string | undefined {
  const items = doc.querySelectorAll("force-record-layout-item, .slds-form-element");
  for (const item of items) {
    if (isHiddenContent(item)) continue;
    const labelEl = item.querySelector(".slds-form-element__label, .test-id__field-label");
    if (labelEl && text(labelEl).toLowerCase() === label.toLowerCase()) {
      return fieldValue(item);
    }
  }
  return undefined;
}

/**
 * Extract the display value from a SFDC field container without picking up the
 * label text or action buttons (Edit, Delete, etc.).
 *
 * Strategy order:
 * 1. Lookup fields render the value as an <a> link inside the control area.
 * 2. Text/formula fields use lightning-formatted-text or lightning-formatted-name.
 * 3. Fallback to the raw control/value container text.
 */
function fieldValue(container: Element): string | undefined {
  const ctrl = container.querySelector(".slds-form-element__control, .test-id__field-value");

  // 1. Lookup fields (Contact, Account, etc.) — value is a link
  const link = ctrl?.querySelector<HTMLElement>("a[href]");
  if (link) {
    const t = text(link);
    if (t) return t;
  }

  // 2. Lightning formatted components — value is isolated in its own element
  const formatted = ctrl?.querySelector<HTMLElement>(
    "lightning-formatted-text, lightning-formatted-name, " +
      "lightning-formatted-lookup, .slds-truncate",
  );
  if (formatted) {
    const t = text(formatted);
    if (t) return t;
  }

  // 3. Raw control text — skip if it looks like label + value concatenated
  if (ctrl) {
    const t = text(ctrl);
    const labelEl = container.querySelector(".slds-form-element__label, .test-id__field-label");
    const labelText = labelEl ? text(labelEl).toLowerCase() : "";
    if (t && !t.toLowerCase().startsWith(labelText)) return t;
  }

  return undefined;
}

/** The highlights panel title often contains the case number. */
function fromHighlightsTitle(doc: Document, re: RegExp): string | undefined {
  const candidates = doc.querySelectorAll(
    ".slds-page-header__title, records-highlights2 .entityNameTitle",
  );
  for (const title of candidates) {
    if (!isHiddenContent(title)) {
      const match = text(title).match(re);
      if (match?.[1]) return match[1];
    }
  }
  return undefined;
}

function text(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}
