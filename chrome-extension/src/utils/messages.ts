import type { CaseContext } from "./resolver";
import type { Template } from "./api";

/** Popup → content script: "give me the current case context". */
export interface GetContextRequest {
  type: "DUPLIKATE_GET_CONTEXT";
}

/** Content script → popup/runtime: the latest scraped context (push on change). */
export interface ContextUpdate {
  type: "DUPLIKATE_CONTEXT_UPDATE";
  context: CaseContext | null;
}

/** Content script → background: fetch published templates via the backend. */
export interface FetchTemplatesRequest {
  type: "DUPLIKATE_FETCH_TEMPLATES";
}

/** Background → content script: result of DUPLIKATE_FETCH_TEMPLATES. */
export type FetchTemplatesResponse =
  | { ok: true; templates: Template[] }
  | { ok: false; authError: boolean; error: string };

export type Message = GetContextRequest | ContextUpdate | FetchTemplatesRequest;

export const GET_CONTEXT: GetContextRequest = { type: "DUPLIKATE_GET_CONTEXT" };
export const FETCH_TEMPLATES: FetchTemplatesRequest = { type: "DUPLIKATE_FETCH_TEMPLATES" };
