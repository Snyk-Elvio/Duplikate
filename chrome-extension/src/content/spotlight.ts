import { getToken, type Template } from "../utils/api";
import { FETCH_TEMPLATES, type FetchTemplatesResponse } from "../utils/messages";
import { resolve, type CaseContext } from "../utils/resolver";

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(22, 50, 92, 0.4);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 14vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    color: #111;
  }

  .panel {
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.06);
    width: 600px;
    max-width: calc(100vw - 48px);
    max-height: 500px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: pop 0.14s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes pop {
    from { opacity: 0; transform: scale(0.97) translateY(-6px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }

  .search-row {
    display: flex;
    align-items: center;
    padding: 0 16px;
    border-bottom: 1px solid #ebebeb;
    gap: 10px;
    flex-shrink: 0;
  }

  .search-icon { color: #bbb; flex-shrink: 0; display: flex; }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    line-height: 1;
    padding: 18px 0;
    background: transparent;
    font-family: inherit;
    color: inherit;
  }

  .search-input::placeholder { color: #c0c0c0; }

  .esc-hint {
    font-size: 11px;
    color: #c0c0c0;
    background: #f5f5f5;
    border: 1px solid #e2e2e2;
    border-radius: 4px;
    padding: 2px 7px;
    flex-shrink: 0;
    font-family: inherit;
  }

  .results {
    overflow-y: auto;
    flex: 1;
    padding: 6px;
    min-height: 60px;
  }

  .message {
    padding: 28px 16px;
    text-align: center;
    color: #999;
    font-size: 13px;
  }

  .message.error { color: #c23934; }

  .item {
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .item + .item { margin-top: 2px; }

  .item.active { background: #eef3ff; }

  .item-name {
    font-weight: 600;
    font-size: 14px;
    color: #111;
  }

  .item-preview {
    font-size: 12px;
    color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .footer {
    border-top: 1px solid #ebebeb;
    padding: 7px 16px;
    display: flex;
    gap: 16px;
    flex-shrink: 0;
  }

  .hint {
    font-size: 11px;
    color: #bbb;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .hint kbd {
    font-family: inherit;
    font-size: 10px;
    background: #f5f5f5;
    border: 1px solid #e2e2e2;
    border-radius: 3px;
    padding: 1px 5px;
  }
`;

export class Spotlight {
  private host: HTMLDivElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private resultsEl: HTMLDivElement | null = null;
  private templates: Template[] = [];
  private filtered: Template[] = [];
  private activeIdx = 0;
  private context: CaseContext | null = null;
  private loaded = false;

  setContext(ctx: CaseContext | null): void {
    this.context = ctx;
  }

  isOpen(): boolean {
    return this.host !== null && document.body.contains(this.host);
  }

  async open(): Promise<void> {
    if (this.isOpen()) return;
    this.mount();
    this.inputEl?.focus();
    if (!this.loaded) {
      await this.loadTemplates();
    } else {
      this.renderList(this.inputEl?.value ?? "");
    }
  }

  close(): void {
    this.host?.remove();
    this.host = null;
    this.inputEl = null;
    this.resultsEl = null;
  }

  private mount(): void {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });

    const styleEl = document.createElement("style");
    styleEl.textContent = STYLES;

    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop) this.close();
    });

    const panel = document.createElement("div");
    panel.className = "panel";
    panel.addEventListener("mousedown", (e) => e.stopPropagation());

    // Search row
    const searchRow = document.createElement("div");
    searchRow.className = "search-row";

    const iconEl = document.createElement("span");
    iconEl.className = "search-icon";
    iconEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><line x1="10.2" y1="10.2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

    const inputEl = document.createElement("input");
    inputEl.className = "search-input";
    inputEl.type = "text";
    inputEl.placeholder = "Search templates…";
    inputEl.autocomplete = "off";
    inputEl.spellcheck = false;
    inputEl.addEventListener("input", () => {
      this.activeIdx = 0;
      this.renderList(inputEl.value);
    });
    inputEl.addEventListener("keydown", (e) => this.handleKey(e));

    const escHint = document.createElement("kbd");
    escHint.className = "esc-hint";
    escHint.textContent = "esc";

    searchRow.append(iconEl, inputEl, escHint);

    // Results container
    const resultsEl = document.createElement("div");
    resultsEl.className = "results";
    // Prevent mousedown on results from stealing focus from the search input.
    resultsEl.addEventListener("mousedown", (e) => e.preventDefault());

    // Footer
    const footer = document.createElement("div");
    footer.className = "footer";
    footer.innerHTML = `
      <span class="hint"><kbd>↑ ↓</kbd> navigate</span>
      <span class="hint"><kbd>↵</kbd> copy &amp; close</span>
    `;

    panel.append(searchRow, resultsEl, footer);
    backdrop.appendChild(panel);
    shadow.append(styleEl, backdrop);

    this.host = host;
    this.inputEl = inputEl;
    this.resultsEl = resultsEl;
    this.activeIdx = 0;

    document.body.appendChild(host);
  }

  private async loadTemplates(): Promise<void> {
    if (!this.resultsEl) return;

    const token = await getToken();
    if (!token) {
      this.showMessage("Sign in via the Duplikate popup first.", "error");
      return;
    }

    this.showMessage("Loading templates…");

    try {
      const resp = (await chrome.runtime.sendMessage(
        FETCH_TEMPLATES,
      )) as FetchTemplatesResponse;

      if (!resp.ok) {
        this.showMessage(
          resp.authError
            ? "Session expired — open the Duplikate popup to sign in again."
            : "Could not load templates. Is the backend reachable?",
          "error",
        );
        return;
      }

      this.templates = resp.templates;
      this.loaded = true;
      this.renderList(this.inputEl?.value ?? "");
      // Re-focus: SFDC can steal focus during the async round-trip.
      this.inputEl?.focus();
    } catch {
      this.showMessage("Extension background unreachable — try reloading the page.", "error");
    }
  }

  private showMessage(text: string, variant?: "error"): void {
    if (!this.resultsEl) return;
    this.resultsEl.innerHTML = "";
    const div = document.createElement("div");
    div.className = variant ? `message ${variant}` : "message";
    div.textContent = text;
    this.resultsEl.appendChild(div);
  }

  private plainText(html: string): string {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent ?? "";
  }

  private renderList(query: string): void {
    if (!this.resultsEl) return;

    const q = query.trim().toLowerCase();
    this.filtered = q
      ? this.templates.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            this.plainText(t.html).toLowerCase().includes(q),
        )
      : [...this.templates];

    if (this.filtered.length === 0) {
      this.showMessage(q ? `No templates match "${query}"` : "No templates available.");
      return;
    }

    this.activeIdx = Math.max(0, Math.min(this.activeIdx, this.filtered.length - 1));
    this.resultsEl.innerHTML = "";

    for (let i = 0; i < this.filtered.length; i++) {
      const tpl = this.filtered[i];

      const item = document.createElement("div");
      item.className = "item" + (i === this.activeIdx ? " active" : "");

      const nameEl = document.createElement("div");
      nameEl.className = "item-name";
      nameEl.textContent = tpl.name;

      const previewEl = document.createElement("div");
      previewEl.className = "item-preview";
      previewEl.textContent = this.plainText(tpl.html).slice(0, 140);

      item.append(nameEl, previewEl);

      const idx = i;
      item.addEventListener("click", () => void this.select(idx));
      item.addEventListener("mousemove", () => {
        if (this.activeIdx !== idx) {
          this.activeIdx = idx;
          this.updateActiveClass();
        }
      });

      this.resultsEl.appendChild(item);
    }
  }

  private updateActiveClass(): void {
    if (!this.resultsEl) return;
    const items = this.resultsEl.querySelectorAll<HTMLElement>(".item");
    items.forEach((el, i) => el.classList.toggle("active", i === this.activeIdx));
    items[this.activeIdx]?.scrollIntoView({ block: "nearest" });
  }

  private handleKey(e: KeyboardEvent): void {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        this.close();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (this.activeIdx < this.filtered.length - 1) {
          this.activeIdx++;
          this.updateActiveClass();
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (this.activeIdx > 0) {
          this.activeIdx--;
          this.updateActiveClass();
        }
        break;
      case "Enter":
        e.preventDefault();
        if (this.filtered.length > 0) void this.select(this.activeIdx);
        break;
    }
  }

  private async select(idx: number): Promise<void> {
    const tpl = this.filtered[idx];
    if (!tpl) return;

    const resolvedHtml = resolve(tpl.html, this.context ?? {});
    const tmp = document.createElement("div");
    tmp.innerHTML = resolvedHtml;
    const plain = tmp.textContent ?? "";

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([resolvedHtml], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(plain);
    }

    const name = tpl.name;
    this.close();
    this.toast(`Copied "${name}"`);
  }

  private toast(msg: string): void {
    document.getElementById("dk-spotlight-toast")?.remove();

    const el = document.createElement("div");
    el.id = "dk-spotlight-toast";
    Object.assign(el.style, {
      position: "fixed",
      bottom: "28px",
      left: "50%",
      transform: "translateX(-50%) translateY(8px)",
      background: "#16325c",
      color: "#fff",
      padding: "9px 22px",
      borderRadius: "100px",
      fontSize: "13px",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      zIndex: "2147483647",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      opacity: "0",
      transition: "opacity 0.15s ease, transform 0.15s ease",
      pointerEvents: "none",
    });
    el.textContent = msg;
    document.body.appendChild(el);

    // Double rAF to ensure the initial style is painted before transitioning.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateX(-50%) translateY(0)";
      }),
    );

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(8px)";
      setTimeout(() => el.remove(), 200);
    }, 2200);
  }
}
