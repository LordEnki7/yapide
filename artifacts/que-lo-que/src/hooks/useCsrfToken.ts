import { useEffect } from "react";
import { setCsrfToken } from "@/lib/apiFetch";

/**
 * Fetches the CSRF token from the server once on app startup and stores it
 * so that every subsequent mutation (POST/PATCH/DELETE) includes it
 * automatically in the X-CSRF-Token header.
 *
 * Safe to call multiple times — only fetches once per page load.
 */
let _fetched = false;

export function useCsrfToken(): void {
  useEffect(() => {
    if (_fetched) return;
    _fetched = true;

    fetch("/api/csrf-token", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { token?: string }) => {
        if (data.token) setCsrfToken(data.token);
      })
      .catch(() => {
        // CSRF token fetch failed — mutations will still work for native mobile
        // clients and requests the server considers safe-method or no-origin.
      });
  }, []);
}
