import type { CaseContext } from "./resolver";

/** Popup → content script: "give me the current case context". */
export interface GetContextRequest {
  type: "DUPLIKATE_GET_CONTEXT";
}

/** Content script → popup/runtime: the latest scraped context (push on change). */
export interface ContextUpdate {
  type: "DUPLIKATE_CONTEXT_UPDATE";
  context: CaseContext | null;
}

export type Message = GetContextRequest | ContextUpdate;

export const GET_CONTEXT: GetContextRequest = { type: "DUPLIKATE_GET_CONTEXT" };
