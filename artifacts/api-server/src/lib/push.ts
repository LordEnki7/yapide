import webpush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptionsTable, settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

let vapidKeys: { publicKey: string; privateKey: string } | null = null;

export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (vapidKeys) return vapidKeys;

  const [pubRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "vapid_public_key"));
  const [prvRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "vapid_private_key"));

  if (pubRow && prvRow) {
    vapidKeys = { publicKey: pubRow.value, privateKey: prvRow.value };
    return vapidKeys;
  }

  const generated = webpush.generateVAPIDKeys();
  await db.insert(settingsTable).values([
    { key: "vapid_public_key", value: generated.publicKey },
    { key: "vapid_private_key", value: generated.privateKey },
  ]).onConflictDoNothing();

  vapidKeys = generated;
  return vapidKeys;
}

export async function initPush(): Promise<void> {
  const keys = await getVapidKeys();
  webpush.setVapidDetails("mailto:info@yapide.app", keys.publicKey, keys.privateKey);
}

export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  url = "/"
): Promise<void> {
  const subs = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId));
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url })
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
        }
      }
    })
  );
}
