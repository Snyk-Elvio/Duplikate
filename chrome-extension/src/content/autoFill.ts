/**
 * After a template is copied, automatically navigate to the Case Comments
 * related list, click "New", and paste the template into the rich-text editor.
 *
 * SFDC Lightning markup is volatile — selectors are listed from most specific
 * to least specific so the code degrades gracefully across org configurations.
 * All steps fail silently so a selector mismatch never breaks the copy flow.
 */

// Wait for a CSS selector to appear in the DOM, up to `timeout` ms.
// Uses MutationObserver so there is no polling interval.
function waitFor(selector: string, timeout = 5000): Promise<HTMLElement | null> {
  const existing = document.querySelector<HTMLElement>(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

// Find a tab by its visible label text, checking common SFDC tab components.
function findTabByLabel(label: string): HTMLElement | null {
  const lower = label.toLowerCase();
  const selectors = [
    'a[role="tab"]',
    'li[role="tab"]',
    ".slds-tabs_default__link",
    "lightning-tab-bar a",
    "a.tabHeader",
  ];
  for (const sel of selectors) {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.textContent?.trim().toLowerCase() === lower) return el;
    }
  }
  // Broad fallback: any <a> or <li> whose trimmed text exactly matches.
  for (const el of document.querySelectorAll<HTMLElement>("a, li")) {
    if (el.textContent?.trim().toLowerCase() === lower) return el;
  }
  return null;
}

// Locate the Case Comments related list card by scanning heading text.
// SFDC renders related lists as card-like containers; the exact component
// element changes between API versions so we match on visible heading text.
function findCaseCommentsSection(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    [
      "force-related-list-single-container",
      "article.slds-card",
      ".slds-card",
      "records-related-list-single-container",
    ].join(", "),
  );
  for (const card of candidates) {
    const heading = card.querySelector("h2, h3, .slds-card__header-title, .title");
    if (heading?.textContent?.toLowerCase().includes("case comment")) return card;
  }
  return null;
}

// Navigate to the Case Comments section, open a new comment form, and paste
// the template HTML into the rich-text editor.
export async function autoFillComment(richHtml: string, plain: string): Promise<void> {
  // Step 1 — make the Case Comments section visible by clicking the Comments tab.
  let section = findCaseCommentsSection();

  if (!section) {
    findTabByLabel("Comments")?.click();
    await new Promise((r) => setTimeout(r, 800));
    section = findCaseCommentsSection();
  }

  if (!section) return;

  // Step 2 — open the new comment form if not already open.
  const editorAlreadyOpen = section.querySelector<HTMLElement>(
    '.ql-editor[contenteditable="true"], div[contenteditable="true"], textarea',
  );

  if (!editorAlreadyOpen) {
    let newBtn = section.querySelector<HTMLElement>(
      [
        'a[title="New Case Comment"]',
        'button[title="New Case Comment"]',
        'a[title="New Comment"]',
        'button[title="New Comment"]',
        'a[title="New"]',
        'button[title="New"]',
        'a[name="new"]',
        'button[name="new"]',
      ].join(", "),
    );

    if (!newBtn) {
      for (const el of section.querySelectorAll<HTMLElement>("a, button")) {
        const t = el.textContent?.trim().replace(/^\+\s*/, "").toLowerCase();
        if (t === "new") { newBtn = el; break; }
      }
    }

    if (!newBtn) return;

    // Scroll the button into view so the user can see and click it if the
    // programmatic click is ignored by SFDC's LWC isTrusted check.
    newBtn.scrollIntoView({ block: "center", behavior: "smooth" });
    newBtn.click();
  }

  // Step 3 — wait up to 30 s for the editor to appear.
  // Allow time for the user to click New manually if the programmatic click
  // was ignored.
  const editor = await waitFor(
    [
      ".ql-editor[contenteditable='true']",
      "div[contenteditable='true'].slds-rich-text-editor__textarea",
      "div[contenteditable='true'][role='textbox']",
      "textarea.slds-textarea",
      "textarea",
    ].join(", "),
    30000,
  );
  if (!editor) return;

  // Step 4 — paste the moment the editor receives real focus.
  // SFDC LWC blocks programmatic focus from content scripts. Registering a
  // one-shot focus listener means the paste fires automatically whether SFDC
  // auto-focuses the field or the user clicks into it.
  const doInsert = () => {
    requestAnimationFrame(() => {
      if (editor.tagName === "TEXTAREA") {
        (editor as HTMLTextAreaElement).value = plain;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        editor.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const range = document.createRange();
        range.setStart(editor, 0);
        range.collapse(true);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        const ok = document.execCommand("insertHTML", false, richHtml);
        if (!ok) document.execCommand("insertText", false, plain);
      }
    });
  };

  editor.addEventListener("focus", doInsert, { once: true });
  editor.focus();
}
