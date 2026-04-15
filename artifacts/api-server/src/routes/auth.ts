import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
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

export default router;
