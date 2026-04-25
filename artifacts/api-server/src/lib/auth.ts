import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

// ─── Hashing ─────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Compare candidate against stored hash.
// Supports legacy SHA-256 hashes so existing users are not locked out.
// On successful legacy match, caller should upgrade the stored hash.
export async function verifyPassword(
  candidate: string,
  storedHash: string,
): Promise<{ valid: boolean; legacy: boolean }> {
  if (storedHash.startsWith("$2b$") || storedHash.startsWith("$2a$")) {
    const valid = await bcrypt.compare(candidate, storedHash);
    return { valid, legacy: false };
  }
  // Legacy SHA-256 path
  const legacyHash = createHash("sha256")
    .update(candidate + "qlq-salt-2024")
    .digest("hex");
  return { valid: legacyHash === storedHash, legacy: true };
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export async function getUserFromSession(req: Request) {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) return null;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, sessionUserId));
  return user || null;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const sessionUserId = (req.session as any)?.userId;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, sessionUserId));
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as any).currentUser = user;
    next();
  };
}
