/**
 * Duplikate content script.
 *
 * SFDC Lightning is a single-page app, so we can't rely on full page loads.
 * We watch for (a) DOM mutations and (b) history-driven URL changes, both
 * debounced by 100ms, then re-scrape the case page. The latest context is
 * cached and (1) pushed to the runtime on change and (2) served on request
 * from the popup.
 */
import { GET_CONTEXT, type ContextUpdate, type Message } from "../utils/messages";
import type { CaseContext } from "../utils/resolver";
import { scrapeCaseContext } from "./scrape";

const DEBOUNCE_MS = 100;

let lastContext: CaseContext | null = null;
let lastUrl = location.href;

function serialize(ctx: CaseContext): string {
  return JSON.stringify(ctx ?? {});
}

function refresh(): void {
  const ctx = scrapeCaseContext();
  const hasAny = Boolean(ctx.caseNumber || ctx.customerFullName);
  const next = hasAny ? ctx : null;

  if (serialize(next ?? {}) !== serialize(lastContext ?? {})) {
    lastContext = next;
    const update: ContextUpdate = { type: "DUPLIKATE_CONTEXT_UPDATE", context: next };
    // Push to the runtime; ignore "no receiver" errors when the popup is closed.
    chrome.runtime.sendMessage(update).catch(() => {});
  }
}

function debounce<F extends (...args: never[]) => void>(fn: F, ms: number): F {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as F;
}

const debouncedRefresh = debounce(refresh, DEBOUNCE_MS);

// (a) DOM mutations.
const observer = new MutationObserver(() => debouncedRefresh());
observer.observe(document.documentElement, { childList: true, subtree: true });

// (b) SPA URL changes (Lightning uses pushState/replaceState + hash routing).
function onUrlMaybeChanged(): void {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    debouncedRefresh();
  }
}
for (const evt of ["popstate", "hashchange"] as const) {
  window.addEventListener(evt, onUrlMaybeChanged);
}
for (const method of ["pushState", "replaceState"] as const) {
  const original = history[method];
  history[method] = function patched(this: History, ...args: unknown[]) {
    const result = (original as (...a: unknown[]) => unknown).apply(this, args);
    onUrlMaybeChanged();
    return result;
  } as History[typeof method];
}

// Serve the popup's on-open request.
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === GET_CONTEXT.type) {
    refresh();
    sendResponse({ type: "DUPLIKATE_CONTEXT_UPDATE", context: lastContext });
  }
  return false;
});

// Initial scrape.
refresh();
