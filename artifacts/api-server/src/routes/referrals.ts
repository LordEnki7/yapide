import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  next();
}

// GET /api/referrals/me — get my code + stats
router.get("/referrals/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const [user] = await db.select({
    id: usersTable.id,
    referralCode: usersTable.referralCode,
    referredById: usersTable.referredById,
  }).from(usersTable).where(eq(usersTable.id, userId));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Ensure a code exists (lazy generation)
  let code = user.referralCode;
  if (!code) {
    const { createHash } = await import("crypto");
    code = createHash("md5").update(String(userId) + "yapide2024").digest("hex").slice(0, 7).toUpperCase();
    await db.update(usersTable).set({ referralCode: code }).where(eq(usersTable.id, userId));
  }

  // Count people they referred
  const [{ count: referredCount }] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.referredById, userId));

  // Count how many paid out (i.e. completed first order)
  const [{ count: paidCount }] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(and(eq(usersTable.referredById, userId), eq(usersTable.referralBonusPaid, true)));

  const BONUS_PER_REFERRAL = 100;

  res.json({
    code,
    referredCount: Number(referredCount),
    paidCount: Number(paidCount),
    earnedTotal: Number(paidCount) * BONUS_PER_REFERRAL,
    bonusPerReferral: BONUS_PER_REFERRAL,
  });
});

// POST /api/referrals/validate — check if a code is valid before registering
router.post("/referrals/validate", async (req, res): Promise<void> => {
  const { code } = req.body ?? {};
  if (!code || typeof code !== "string") { res.status(400).json({ valid: false }); return; }
  const [owner] = await db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.referralCode, code.trim().toUpperCase()));
  if (!owner) { res.status(404).json({ valid: false, message: "Código no encontrado" }); return; }
  res.json({ valid: true, referrerName: owner.name.split(" ")[0] });
});

export default router;
