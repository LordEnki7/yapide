import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db/schema";
import { getVapidKeys } from "../lib/push";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/push/vapid-public-key", async (_req, res) => {
  const { publicKey } = await getVapidKeys();
  res.json({ publicKey });
});

router.post("/push/subscribe", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { endpoint, keys } = req.body ?? {};
  if (!endpoint || typeof endpoint !== "string" || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Invalid subscription" }); return;
  }
  await db
    .insert(pushSubscriptionsTable)
    .values({ userId: sessionUserId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: { p256dh: keys.p256dh, auth: keys.auth, userId: sessionUserId } });
  res.json({ ok: true });
});

router.delete("/push/unsubscribe", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) { res.status(400).json({ error: "Missing endpoint" }); return; }
  await db.delete(pushSubscriptionsTable).where(
    and(eq(pushSubscriptionsTable.userId, sessionUserId), eq(pushSubscriptionsTable.endpoint, endpoint))
  );
  res.json({ ok: true });
});

export default router;
