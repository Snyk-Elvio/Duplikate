/**
 * Background service worker.
 *
 * Proxies API calls on behalf of the content script. Content scripts loaded
 * via CRXJS's dynamic-import loader run in the web-page network context, which
 * means their fetch() calls are subject to the host page's CSP. The service
 * worker runs in the extension's own context and bypasses that restriction.
 */
import { fetchTemplates, AuthError } from "../utils/api";
import type { FetchTemplatesResponse } from "../utils/messages";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "DUPLIKATE_FETCH_TEMPLATES") {
    fetchTemplates()
      .then((templates): FetchTemplatesResponse => ({ ok: true, templates }))
      .catch((err): FetchTemplatesResponse => ({
        ok: false,
        authError: err instanceof AuthError,
        error: err instanceof Error ? err.message : String(err),
      }))
      .then(sendResponse);
    return true; // keep the channel open for the async response
  }
});
