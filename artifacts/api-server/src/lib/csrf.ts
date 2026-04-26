import crypto from "crypto";
import { type Request, type Response, type NextFunction } from "express";

// ── Safe origins that bypass CSRF (native Capacitor/Ionic apps) ──────────────
const NATIVE_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "https://localhost",
]);

function isMobileNative(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // No origin = native / server-to-server
  return NATIVE_ORIGINS.has(origin);
}

function isSafeMethod(method: string): boolean {
  return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

// ── Token generation ─────────────────────────────────────────────────────────
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ── Express endpoint handler — GET /api/csrf-token ───────────────────────────
export function csrfTokenHandler(req: Request, res: Response): void {
  const sess = req.session as any;
  if (!sess.csrfToken) {
    sess.csrfToken = generateCsrfToken();
  }
  res.json({ token: sess.csrfToken });
}

// ── Middleware — validates X-CSRF-Token on mutations ─────────────────────────
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip safe methods
  if (isSafeMethod(req.method)) { next(); return; }
  // Skip native mobile apps (no browser CSRF threat)
  if (isMobileNative(req)) { next(); return; }

  const sess = req.session as any;
  const sessionToken = sess?.csrfToken;
  const requestToken = req.headers["x-csrf-token"] as string | undefined;

  if (!sessionToken || !requestToken) {
    res.status(403).json({ error: "CSRF token missing" });
    return;
  }

  // Timing-safe compare
  const a = Buffer.from(sessionToken);
  const b = Buffer.from(requestToken);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) {
    res.status(403).json({ error: "CSRF token invalid" });
    return;
  }

  next();
}
