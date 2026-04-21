import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
  };
}

function hashPin(pin: string): string {
  return hashPassword(pin);
}

// ─── Email / password register ─────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role, phone } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    phone: phone ?? null,
    passwordHash: hashPassword(password),
    role,
  }).returning();

  (req.session as any).userId = user.id;
  res.status(201).json({ user: formatUser(user), token: `session-${user.id}` });
});

// ─── Email / password login ─────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.isBanned) {
    res.status(403).json({ error: "Account is banned" });
    return;
  }
  (req.session as any).userId = user.id;
  res.json({ user: formatUser(user), token: `session-${user.id}` });
});

// ─── Phone + PIN register ────────────────────────────────────────────────────
router.post("/auth/phone-register", async (req, res): Promise<void> => {
  const { name, phone, pin, role } = req.body ?? {};
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({ error: "Name must be at least 2 characters" });
    return;
  }
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    res.status(400).json({ error: "Enter a valid phone number (at least 10 digits)" });
    return;
  }
  if (!pin || typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) {
    res.status(400).json({ error: "PIN must be 4–6 digits" });
    return;
  }
  const allowedRoles = ["customer", "driver", "business"];
  const userRole = allowedRoles.includes(role) ? role : "customer";

  const syntheticEmail = `phone_${digits}@yapide.internal`;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, syntheticEmail));
  if (existing.length > 0) {
    res.status(409).json({ error: "This phone number is already registered. Use phone login." });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    name: name.trim(),
    email: syntheticEmail,
    phone: digits,
    passwordHash: hashPassword(syntheticEmail + "_stub"),
    pinHash: hashPin(pin),
    role: userRole,
  }).returning();

  (req.session as any).userId = user.id;
  res.status(201).json({ user: formatUser(user), token: `session-${user.id}` });
});

// ─── Phone + PIN login ───────────────────────────────────────────────────────
router.post("/auth/phone-login", async (req, res): Promise<void> => {
  const { phone, pin } = req.body ?? {};
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }
  if (!pin || typeof pin !== "string") {
    res.status(400).json({ error: "PIN is required" });
    return;
  }
  const digits = phone.replace(/\D/g, "");
  const syntheticEmail = `phone_${digits}@yapide.internal`;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, syntheticEmail));
  if (!user || !user.pinHash || user.pinHash !== hashPin(pin)) {
    res.status(401).json({ error: "Número o PIN incorrecto" });
    return;
  }
  if (user.isBanned) {
    res.status(403).json({ error: "Esta cuenta está suspendida" });
    return;
  }
  (req.session as any).userId = user.id;
  res.json({ user: formatUser(user), token: `session-${user.id}` });
});

// ─── Current user ────────────────────────────────────────────────────────────
router.get("/auth/me", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.put("/auth/me", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { name, phone } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({ error: "Name must be at least 2 characters" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ name: name.trim(), phone: phone?.trim() || null })
    .where(eq(usersTable.id, sessionUserId))
    .returning();
  res.json(formatUser(updated));
});

router.delete("/auth/me", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, sessionUserId));
  (req.session as any).userId = undefined;
  res.json({ success: true });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  (req.session as any).userId = undefined;
  res.json({ success: true });
});

// ─── Admin: notification log ─────────────────────────────────────────────────
router.get("/admin/notifications", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const rows = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(200);
  res.json(rows);
});

export default router;
