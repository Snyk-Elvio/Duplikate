/**
 * Case context scraped from the SFDC case page by the content script.
 * Any field may be missing if it couldn't be found on the page.
 */
export interface CaseContext {
  customerFullName?: string;
  customerFirstName?: string;
  caseNumber?: string;
}

/**
 * Maps a `{{PLACEHOLDER}}` token name to the context field that fills it.
 * `customerFirstName` falls back to the first word of `customerFullName`.
 */
const PLACEHOLDER_RESOLVERS: Record<string, (ctx: CaseContext) => string | undefined> = {
  CUSTOMER_FULL_NAME: (ctx) => ctx.customerFullName,
  CUSTOMER_FIRST_NAME: (ctx) =>
    ctx.customerFirstName ?? ctx.customerFullName?.trim().split(/\s+/)[0],
  CASE_NUMBER: (ctx) => ctx.caseNumber,
};

// Matches {{ TOKEN }} with optional surrounding whitespace; token is A-Z, 0-9, _.
const PLACEHOLDER_RE = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;

/**
 * Resolve `{{PLACEHOLDERS}}` in `templateHtml` using `context`.
 *
 * Pure function — no DOM, no side effects.
 *
 * - Known placeholders with a non-empty value are replaced.
 * - Unknown placeholders, and known placeholders missing from the context,
 *   are left untouched (so the user can see what wasn't filled).
 * - A null/undefined context replaces nothing and never throws.
 */
export function resolve(
  templateHtml: string,
  context: CaseContext | null | undefined,
): string {
  if (!context) {
    return templateHtml;
  }
  return templateHtml.replace(PLACEHOLDER_RE, (match, token: string) => {
    const resolver = PLACEHOLDER_RESOLVERS[token];
    if (!resolver) {
      return match; // unknown placeholder — leave as-is
    }
    const value = resolver(context);
    return value !== undefined && value !== "" ? value : match;
  });
}

/** True if the context has at least one usable field. */
export function hasContext(context: CaseContext | null | undefined): boolean {
  return Boolean(
    context &&
      (context.customerFullName || context.customerFirstName || context.caseNumber),
  );
}
