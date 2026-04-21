import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export type AdminRole = "owner" | "master" | "staff";
export type Permission =
  | "dashboard" | "users" | "drivers" | "businesses" | "orders"
  | "promo_codes" | "notifications" | "command_center" | "staff";

export function getEffectivePermissions(adminRole: string | null | undefined, permissionsJson: string | null | undefined): Permission[] {
  const all: Permission[] = ["dashboard","users","drivers","businesses","orders","promo_codes","notifications","command_center","staff"];
  if (adminRole === "owner" || adminRole === "master") return all;
  if (!permissionsJson) return ["dashboard"];
  try {
    const parsed = JSON.parse(permissionsJson) as Permission[];
    return parsed.filter(p => all.includes(p));
  } catch {
    return ["dashboard"];
  }
}

// Middleware: require admin + specific permission
export function requireAdminPermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req.session as any)?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user || user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const perms = getEffectivePermissions(user.adminRole, user.adminPermissions);
    if (!perms.includes(permission)) { res.status(403).json({ error: "No tienes permiso para esta sección" }); return; }
    next();
  };
}

// Middleware: require admin (any level)
export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req.session as any)?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user || user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    next();
  };
}
