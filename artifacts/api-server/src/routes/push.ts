import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db/schema";
import { getVapidKeys, sendPushToUser } from "../lib/push";
import { eq, and, lte } from "drizzle-orm";

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

// POST /api/push/broadcast — admin sends push to all users or a segment
router.post("/push/broadcast", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, body, url, segment } = req.body ?? {};
  if (!title || !body) { res.status(400).json({ error: "title and body required" }); return; }

  let users: { id: number }[];

  if (segment === "inactive") {
    // Users who haven't ordered in 30+ days — get all users with push subs and filter
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    users = await db.execute<{ id: number }>(
      `SELECT DISTINCT u.id FROM users u
       INNER JOIN push_subscriptions ps ON ps.user_id = u.id
       WHERE u.role = 'customer'
       AND (u.created_at < $1)
       AND u.id NOT IN (
         SELECT DISTINCT customer_id FROM orders WHERE created_at > $1
       )` as any,
    ).catch(() => db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "customer"))) as any;
  } else if (segment === "new") {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    users = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.role, "customer"), lte(usersTable.createdAt, sevenDaysAgo))) as any;
  } else {
    users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "customer"));
  }

  const notifUrl = url || "/customer";
  let sent = 0;
  await Promise.allSettled(
    users.map(async (u) => {
      try {
        await sendPushToUser(u.id, title, body, notifUrl);
        sent++;
      } catch {}
    })
  );

  res.json({ ok: true, targeted: users.length, sent });
});

export default router;
