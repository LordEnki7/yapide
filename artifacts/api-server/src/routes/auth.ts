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
    adminRole: user.adminRole ?? null,
    adminPermissions: user.adminPermissions ? JSON.parse(user.adminPermissions) : null,
    isBanned: user.isBanned,
    phoneVerified: user.phoneVerified,
    createdAt: user.createdAt,
  };
}

function hashPin(pin: string): string {
  return hashPassword(pin);
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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
    res.status(409).json({ error: "Este número ya está registrado. Usa inicio de sesión con teléfono." });
    return;
  }

  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  const [user] = await db.insert(usersTable).values({
    name: name.trim(),
    email: syntheticEmail,
    phone: digits,
    passwordHash: hashPassword(syntheticEmail + "_stub"),
    pinHash: hashPin(pin),
    role: userRole,
    phoneVerified: false,
    otpCode: otp,
    otpExpiresAt: otpExpiry,
  }).returning();

  (req.session as any).userId = user.id;

  res.status(201).json({
    user: formatUser(user),
    token: `session-${user.id}`,
    otpCode: otp,
  });
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

// ─── Verify phone OTP ────────────────────────────────────────────────────────
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const { otp } = req.body ?? {};
  if (!otp || typeof otp !== "string") {
    res.status(400).json({ error: "Código requerido" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  if (user.phoneVerified) {
    res.json({ success: true, message: "Teléfono ya verificado" });
    return;
  }
  if (!user.otpCode || user.otpCode !== otp.trim()) {
    res.status(400).json({ error: "Código incorrecto" });
    return;
  }
  if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
    res.status(400).json({ error: "El código expiró. Solicita uno nuevo." });
    return;
  }
  await db.update(usersTable)
    .set({ phoneVerified: true, otpCode: null, otpExpiresAt: null })
    .where(eq(usersTable.id, sessionUserId));

  res.json({ success: true });
});

// ─── Resend OTP ──────────────────────────────────────────────────────────────
router.post("/auth/resend-otp", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!user || !user.phone) {
    res.status(400).json({ error: "Sin número de teléfono" });
    return;
  }
  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await db.update(usersTable)
    .set({ otpCode: otp, otpExpiresAt: otpExpiry })
    .where(eq(usersTable.id, sessionUserId));

  res.json({ otpCode: otp });
});

// ─── Forgot PIN (send reset code) ────────────────────────────────────────────
router.post("/auth/forgot-pin", async (req, res): Promise<void> => {
  const { phone } = req.body ?? {};
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "Número de teléfono requerido" });
    return;
  }
  const digits = phone.replace(/\D/g, "");
  const syntheticEmail = `phone_${digits}@yapide.internal`;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, syntheticEmail));
  if (!user) {
    res.status(404).json({ error: "No encontramos una cuenta con ese número" });
    return;
  }
  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await db.update(usersTable)
    .set({ otpCode: otp, otpExpiresAt: otpExpiry })
    .where(eq(usersTable.id, user.id));

  res.json({ otpCode: otp, userId: user.id });
});

// ─── Reset PIN ───────────────────────────────────────────────────────────────
router.post("/auth/reset-pin", async (req, res): Promise<void> => {
  const { phone, otp, newPin } = req.body ?? {};
  if (!phone || !otp || !newPin) {
    res.status(400).json({ error: "Faltan datos requeridos" });
    return;
  }
  if (!/^\d{4,6}$/.test(newPin)) {
    res.status(400).json({ error: "El PIN debe ser de 4 a 6 dígitos" });
    return;
  }
  const digits = phone.replace(/\D/g, "");
  const syntheticEmail = `phone_${digits}@yapide.internal`;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, syntheticEmail));
  if (!user) {
    res.status(404).json({ error: "Cuenta no encontrada" });
    return;
  }
  if (!user.otpCode || user.otpCode !== otp.trim()) {
    res.status(400).json({ error: "Código incorrecto" });
    return;
  }
  if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
    res.status(400).json({ error: "El código expiró. Solicita uno nuevo." });
    return;
  }
  await db.update(usersTable)
    .set({ pinHash: hashPin(newPin), otpCode: null, otpExpiresAt: null })
    .where(eq(usersTable.id, user.id));

  res.json({ success: true });
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
