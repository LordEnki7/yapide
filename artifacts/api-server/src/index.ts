import app from "./app";
import { logger } from "./lib/logger";
import { initPush, sendPushToUser } from "./lib/push";
import { fileURLToPath } from "url";
import { db, ordersTable, driversTable, businessesTable } from "@workspace/db";
import { eq, and, isNull, lte, isNotNull } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ─── Auto-dispatch background agent ──────────────────────────────────────────
async function runAutoDispatch() {
  try {
    const unassigned = await db.select().from(ordersTable)
      .where(and(eq(ordersTable.status, "accepted"), isNull(ordersTable.driverId)));

    if (unassigned.length === 0) return;

    const onlineDrivers = await db.select().from(driversTable)
      .where(and(eq(driversTable.isOnline, true), eq(driversTable.isLocked, false)));

    if (onlineDrivers.length === 0) return;

    let dispatched = 0;
    for (const order of unassigned) {
      let bestDriver = onlineDrivers[0];
      let bestScore = -1;
      for (const d of onlineDrivers) {
        const score = (d.rating ?? 4.5) * 20 + (d.acceptanceRate ?? 80) * 0.5 + (d.totalDeliveries > 100 ? 10 : d.totalDeliveries / 10);
        if (score > bestScore) { bestScore = score; bestDriver = d; }
      }
      await db.update(ordersTable).set({ driverId: bestDriver.id }).where(eq(ordersTable.id, order.id));
      dispatched++;
    }

    if (dispatched > 0) {
      logger.info({ dispatched }, "Auto-dispatch: assigned orders to drivers");
    }
  } catch (err) {
    logger.warn({ err }, "Auto-dispatch tick failed");
  }
}

// ─── Scheduled orders activation ─────────────────────────────────────────────
async function activateScheduledOrders() {
  try {
    const now = new Date();
    const ready = await db.select().from(ordersTable)
      .where(and(
        eq(ordersTable.status, "pending"),
        isNotNull(ordersTable.scheduledFor),
        lte(ordersTable.scheduledFor, now),
      ));
    for (const order of ready) {
      const [biz] = await db.select({ userId: businessesTable.userId, name: businessesTable.name })
        .from(businessesTable).where(eq(businessesTable.id, order.businessId));
      if (biz) {
        sendPushToUser(biz.userId, "📅 Pedido programado listo", `Pedido #${order.id} — ya es hora de prepararlo`, "/business/orders").catch(() => {});
      }
      await db.update(ordersTable).set({ scheduledFor: null }).where(eq(ordersTable.id, order.id));
      logger.info({ orderId: order.id }, "Scheduled order activated");
    }
  } catch (err) {
    logger.warn({ err }, "Scheduled-order activation tick failed");
  }
}

// Only bind the port when this file is the actual entry point.
// If something dynamically imports this module (e.g. a health-check wrapper),
// we skip listen() to avoid EADDRINUSE on the already-bound port.
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  initPush().catch((err) => logger.warn({ err }, "Push init failed — continuing without push"));

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");

    // Start auto-dispatch loop every 30 seconds
    setInterval(runAutoDispatch, 30_000);
    logger.info("Auto-dispatch agent started (30s interval)");

    // Check for scheduled orders every 60 seconds
    setInterval(activateScheduledOrders, 60_000);
    logger.info("Scheduled-order activation agent started (60s interval)");
  });
}
