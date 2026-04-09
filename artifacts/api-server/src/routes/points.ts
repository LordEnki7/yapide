import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, usersTable, pointsTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

export const POINTS_PER_REDEMPTION = 500;
export const REDEMPTION_VALUE = 500;
export const POINTS_RATE = 10;

router.get("/customer/points", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) return res.status(404).json({ error: "User not found" });

  const transactions = await db
    .select()
    .from(pointsTransactionsTable)
    .where(eq(pointsTransactionsTable.userId, req.session.userId))
    .orderBy(desc(pointsTransactionsTable.createdAt))
    .limit(50);

  return res.json({
    points: user.points,
    nextRewardAt: POINTS_PER_REDEMPTION,
    redemptionValue: REDEMPTION_VALUE,
    progress: Math.min(user.points % POINTS_PER_REDEMPTION, POINTS_PER_REDEMPTION),
    redeemableRewards: Math.floor(user.points / POINTS_PER_REDEMPTION),
    transactions,
  });
});

router.post("/customer/points/redeem", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.points < POINTS_PER_REDEMPTION) {
    return res.status(400).json({ error: `Need ${POINTS_PER_REDEMPTION} points to redeem. You have ${user.points}.` });
  }

  const newPoints = user.points - POINTS_PER_REDEMPTION;

  await db.update(usersTable).set({ points: newPoints }).where(eq(usersTable.id, user.id));

  await db.insert(pointsTransactionsTable).values({
    userId: user.id,
    orderId: null,
    type: "redeem",
    amount: -POINTS_PER_REDEMPTION,
    description: `Canje: RD$${REDEMPTION_VALUE} de descuento / Redeemed: RD$${REDEMPTION_VALUE} free meal`,
  });

  return res.json({
    success: true,
    pointsUsed: POINTS_PER_REDEMPTION,
    discountAmount: REDEMPTION_VALUE,
    newPoints,
    message: "¡Comida gratis! / Free meal redeemed!",
  });
});

export default router;
