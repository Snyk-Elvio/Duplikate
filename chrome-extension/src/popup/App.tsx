import { useEffect, useState } from "react";

import {
  AuthError,
  type Template,
  type User,
  fetchTemplates,
  getToken,
  login,
  logout,
  shareResponse,
} from "../utils/api";
import { hasContext, resolve } from "../utils/resolver";
import { useCaseContext } from "./useCaseContext";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        const { user: stored } = await chrome.storage.local.get("user");
        setUser(stored ?? null);
      }
      setBooting(false);
    })();
  }, []);

  if (booting) return <div className="dk-card">Loading…</div>;
  if (!user) return <LoginView onLoggedIn={setUser} />;
  return <TemplatesView user={user} onLogout={() => setUser(null)} />;
}

function LoginView({ onLoggedIn }: { onLoggedIn: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { user } = await login(email.trim());
      onLoggedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dk-card">
      <h1 className="dk-title">Duplikate</h1>
      <p className="dk-muted">Sign in with your work email.</p>
      <form onSubmit={submit} className="dk-form">
        <input
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="dk-input"
        />
        <button type="submit" disabled={busy} className="dk-btn dk-btn-primary">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && <p className="dk-error">{error}</p>}
    </div>
  );
}

function TemplatesView({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { context, loading: ctxLoading } = useCaseContext();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setTemplates(await fetchTemplates());
      } catch (err) {
        if (err instanceof AuthError) {
          await logout();
          onLogout();
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load templates.");
      } finally {
        setLoading(false);
      }
    })();
  }, [onLogout]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  async function copy(t: Template) {
    const resolved = resolve(t.html, context);
    try {
      // Copy as rich text (templates are HTML) with a plain-text fallback.
      const item = new ClipboardItem({
        "text/html": new Blob([resolved], { type: "text/html" }),
        "text/plain": new Blob([stripHtml(resolved)], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
    } catch {
      await navigator.clipboard.writeText(stripHtml(resolved));
    }
    flash(`Copied “${t.name}”`);
  }

  async function share(t: Template) {
    const recipientEmail = window.prompt("Share to which colleague's email?");
    if (!recipientEmail) return;
    try {
      await shareResponse({
        recipientEmail: recipientEmail.trim(),
        templateId: t.id,
        resolvedText: resolve(t.html, context),
      });
      flash(`Shared “${t.name}” with ${recipientEmail}`);
    } catch (err) {
      if (err instanceof AuthError) {
        await logout();
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : "Share failed.");
    }
  }

  return (
    <div className="dk-card">
      <header className="dk-header">
        <h1 className="dk-title">Duplikate</h1>
        <button
          className="dk-btn dk-btn-link"
          onClick={async () => {
            await logout();
            onLogout();
          }}
        >
          Sign out
        </button>
      </header>
      <p className="dk-muted">{user.email}</p>

      {!ctxLoading && !hasContext(context) && (
        <div className="dk-banner dk-banner-warn">
          No case context detected. You can still copy, but placeholders will stay
          unresolved.
        </div>
      )}
      {hasContext(context) && (
        <div className="dk-banner dk-banner-ok">
          {context?.caseNumber && <span>Case #{context.caseNumber}</span>}
          {context?.customerFullName && <span> · {context.customerFullName}</span>}
        </div>
      )}

      {notice && <div className="dk-banner dk-banner-info">{notice}</div>}
      {error && <p className="dk-error">{error}</p>}

      {loading ? (
        <p className="dk-muted">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="dk-muted">No templates available yet.</p>
      ) : (
        <ul className="dk-list">
          {templates.map((t) => (
            <li key={t.id} className="dk-item">
              <div className="dk-item-head">
                <span className="dk-item-name">{t.name}</span>
                <span className="dk-tag">{t.visibility ?? "global"}</span>
              </div>
              <div
                className="dk-preview"
                dangerouslySetInnerHTML={{ __html: resolve(t.html, context) }}
              />
              <div className="dk-actions">
                <button className="dk-btn dk-btn-primary" onClick={() => copy(t)}>
                  Copy
                </button>
                <button className="dk-btn" onClick={() => share(t)}>
                  Share
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent ?? "";
}
