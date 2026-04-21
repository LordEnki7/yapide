import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { requireAdminPermission } from "../lib/adminPermissions";

const router: IRouter = Router();

const ALL_PERMISSIONS = ["dashboard","users","drivers","businesses","orders","promo_codes","notifications","command_center","staff"] as const;
type Permission = typeof ALL_PERMISSIONS[number];

function formatStaff(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    adminRole: user.adminRole ?? "staff",
    adminPermissions: user.adminPermissions ? JSON.parse(user.adminPermissions) : [],
    createdAt: user.createdAt,
  };
}

// ─── List all admin staff ──────────────────────────────────────────────────
router.get("/admin/staff", requireAdminPermission("staff"), async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));

  const staff = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
  // Owner can see everyone; master can see only staff (not other owners)
  const filtered = staff.filter(u => {
    if (me.adminRole === "owner") return true;
    if (me.adminRole === "master") return u.adminRole !== "owner";
    return false;
  }).filter(u => u.id !== sessionUserId); // hide self

  res.json(filtered.map(formatStaff));
});

// ─── Get current admin's own info (permissions etc.) ──────────────────────
router.get("/admin/staff/me", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  res.json(formatStaff(user));
});

// ─── Create staff member ──────────────────────────────────────────────────
router.post("/admin/staff", requireAdminPermission("staff"), async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));

  const { name, email, password, adminRole, permissions } = req.body;

  if (!name?.trim() || name.trim().length < 2) { res.status(400).json({ error: "Name required" }); return; }
  if (!email?.trim()) { res.status(400).json({ error: "Email required" }); return; }
  if (!password || password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }

  const allowedRoles: string[] = me.adminRole === "owner" ? ["master", "staff"] : ["staff"];
  const targetRole: string = allowedRoles.includes(adminRole) ? adminRole : "staff";

  // Owner can't be created via this endpoint
  if (adminRole === "owner") { res.status(403).json({ error: "Cannot create owner accounts" }); return; }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.trim()));
  if (existing.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }

  const permsArray: Permission[] = targetRole === "staff"
    ? (Array.isArray(permissions) ? permissions.filter((p: string) => ALL_PERMISSIONS.includes(p as Permission)) : ["dashboard"])
    : [];

  const [user] = await db.insert(usersTable).values({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role: "admin",
    adminRole: targetRole,
    adminPermissions: targetRole === "staff" ? JSON.stringify(permsArray) : null,
    isBanned: false,
    points: 0,
  }).returning();

  res.status(201).json(formatStaff(user));
});

// ─── Update staff member ──────────────────────────────────────────────────
router.patch("/admin/staff/:id", requireAdminPermission("staff"), async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!target || target.role !== "admin") { res.status(404).json({ error: "Staff not found" }); return; }

  // Owners can only be updated by owners; masters can only update staff
  if (target.adminRole === "owner" && me.adminRole !== "owner") { res.status(403).json({ error: "Cannot modify owner accounts" }); return; }
  if (target.adminRole === "master" && me.adminRole !== "owner") { res.status(403).json({ error: "Only owner can modify master accounts" }); return; }

  const { name, password, adminRole, permissions } = req.body;
  const updateData: Partial<typeof usersTable.$inferInsert> = {};

  if (name?.trim()?.length >= 2) updateData.name = name.trim();
  if (password?.length >= 8) updateData.passwordHash = hashPassword(password);

  const allowedRoles = me.adminRole === "owner" ? ["master", "staff"] : ["staff"];
  if (adminRole && allowedRoles.includes(adminRole) && target.adminRole !== "owner") {
    updateData.adminRole = adminRole;
    if (adminRole === "staff") {
      const permsArray: Permission[] = Array.isArray(permissions)
        ? permissions.filter((p: string) => ALL_PERMISSIONS.includes(p as Permission))
        : ["dashboard"];
      updateData.adminPermissions = JSON.stringify(permsArray);
    } else {
      updateData.adminPermissions = null;
    }
  } else if (target.adminRole === "staff" && Array.isArray(permissions)) {
    const permsArray: Permission[] = permissions.filter((p: string) => ALL_PERMISSIONS.includes(p as Permission));
    updateData.adminPermissions = JSON.stringify(permsArray);
  }

  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, targetId)).returning();
  res.json(formatStaff(updated));
});

// ─── Remove staff member ───────────────────────────────────────────────────
router.delete("/admin/staff/:id", requireAdminPermission("staff"), async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId) || targetId === sessionUserId) { res.status(400).json({ error: "Invalid request" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!target || target.role !== "admin") { res.status(404).json({ error: "Staff not found" }); return; }
  if (target.adminRole === "owner") { res.status(403).json({ error: "Cannot remove owner accounts" }); return; }
  if (target.adminRole === "master" && me.adminRole !== "owner") { res.status(403).json({ error: "Only owner can remove master accounts" }); return; }

  await db.delete(usersTable).where(eq(usersTable.id, targetId));
  res.json({ success: true });
});

export default router;
