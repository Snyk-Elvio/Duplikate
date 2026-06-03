import { useEffect, useState } from "react";

import { GET_CONTEXT, type Message } from "../utils/messages";
import type { CaseContext } from "../utils/resolver";

/**
 * Fetches the current SFDC case context from the active tab's content script,
 * and stays in sync with any pushed updates while the popup is open.
 */
export function useCaseContext(): { context: CaseContext | null; loading: boolean } {
  const [context, setContext] = useState<CaseContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id == null) {
          if (!cancelled) setContext(null);
          return;
        }
        const resp = (await chrome.tabs.sendMessage(tab.id, GET_CONTEXT).catch(
          () => null,
        )) as { context: CaseContext | null } | null;
        if (!cancelled) setContext(resp?.context ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    const listener = (message: Message) => {
      if (message.type === "DUPLIKATE_CONTEXT_UPDATE") {
        setContext(message.context);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      cancelled = true;
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  return { context, loading };
}
