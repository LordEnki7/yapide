import { setCsrfToken as setClientCsrfToken } from "@workspace/api-client-react";

// ── Module-level CSRF token (shared across all manual fetch calls) ────────────
let _csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  _csrfToken = token;
  setClientCsrfToken(token); // also update the generated API client
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Drop-in replacement for fetch() that:
 * - Always sends cookies (credentials: "include")
 * - Injects X-CSRF-Token on state-changing requests
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (_csrfToken && !SAFE_METHODS.has(method) && !headers.has("x-csrf-token")) {
    headers.set("x-csrf-token", _csrfToken);
  }

  return fetch(input, { ...init, headers, credentials: "include" });
}
