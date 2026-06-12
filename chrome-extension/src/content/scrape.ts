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
  const candidates = doc.querySelectorAll(
    `[data-target-selection-name$="${field}"], [data-target-selection-name$="${field}"] *`,
  );
  for (const el of candidates) {
    if (!isHiddenContent(el)) {
      return text(el.closest("[data-target-selection-name]") ?? el);
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
