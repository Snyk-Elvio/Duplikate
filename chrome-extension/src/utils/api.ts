/**
 * Thin backend client for the Duplikate API.
 *
 * The base URL and the stored JWT live in chrome.storage.local. On any 401 the
 * token is cleared so the popup re-prompts for login (design: 7-day JWT, re-prompt
 * on expiry).
 */

const DEFAULT_API_BASE = import.meta.env?.VITE_API_BASE ?? "http://localhost:8000";

export interface User {
  id: number;
  email: string;
  is_manager: boolean;
  last_seen: string | null;
}

export interface Template {
  id: number;
  name: string;
  html: string;
  visibility: "personal" | "shared" | "global";
}

export class AuthError extends Error {}

async function getApiBase(): Promise<string> {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  return apiBase || DEFAULT_API_BASE;
}

export async function getToken(): Promise<string | null> {
  const { token } = await chrome.storage.local.get("token");
  return token ?? null;
}

async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(["token", "user"]);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = await getApiBase();
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const resp = await fetch(`${base}${path}`, { ...init, headers });

  if (resp.status === 401) {
    await clearToken();
    throw new AuthError("Session expired — please sign in again.");
  }
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Request failed (${resp.status}): ${body}`);
  }
  return (resp.status === 204 ? undefined : await resp.json()) as T;
}

export async function login(email: string): Promise<{ token: string; user: User }> {
  const base = await getApiBase();
  const resp = await fetch(`${base}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (resp.status === 401) {
    throw new AuthError("No account exists for that email.");
  }
  if (!resp.ok) {
    throw new Error(`Login failed (${resp.status}).`);
  }
  const data = (await resp.json()) as { token: string; user: User };
  await chrome.storage.local.set({ token: data.token, user: data.user });
  return data;
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function fetchTemplates(): Promise<Template[]> {
  return request<Template[]>("/api/templates/");
}

export async function shareResponse(args: {
  recipientEmail: string;
  templateId: number | null;
  resolvedText: string;
}): Promise<void> {
  await request("/api/shares/", {
    method: "POST",
    body: JSON.stringify({
      recipient_email: args.recipientEmail,
      template: args.templateId,
      resolved_text: args.resolvedText,
    }),
  });
}
