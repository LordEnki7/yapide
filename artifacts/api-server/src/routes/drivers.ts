import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, isNull } from "drizzle-orm";
import { db, driversTable, usersTable, ordersTable, orderItemsTable, walletTransactionsTable, businessesTable } from "@workspace/db";
import { RegisterDriverBody, UpdateDriverStatusBody, UpdateDriverLocationBody } from "@workspace/api-zod";
import { CASH_LIMIT } from "../lib/dispatch";
import { sendPushToUser } from "../lib/push";

const router: IRouter = Router();

function formatDriver(d: typeof driversTable.$inferSelect, user?: typeof usersTable.$inferSelect | null) {
  return {
    id: d.id,
    userId: d.userId,
    vehicleType: d.vehicleType,
    vehiclePlate: d.vehiclePlate,
    city: d.city,
    isOnline: d.isOnline,
    isLocked: d.isLocked,
    approvalStatus: d.approvalStatus,
    rating: d.rating,
    acceptanceRate: d.acceptanceRate,
    currentLat: d.currentLat,
    currentLng: d.currentLng,
    cashBalance: d.cashBalance,
    walletBalance: d.walletBalance,
    totalDeliveries: d.totalDeliveries,
    photoUrl: d.photoUrl,
    createdAt: d.createdAt,
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
    } : undefined,
  };
}

router.post("/drivers/register", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = RegisterDriverBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
  if (existing.length > 0) { res.status(409).json({ error: "Already registered as driver" }); return; }
  const [driver] = await db.insert(driversTable).values({
    userId: sessionUserId,
    vehicleType: parsed.data.vehicleType,
    vehiclePlate: parsed.data.vehiclePlate ?? null,
    city: (parsed.data as any).city ?? "Santiago",
    approvalStatus: "pending",
  }).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  res.status(201).json(formatDriver(driver, user));
});

router.get("/drivers/me", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  res.json(formatDriver(driver, user));
});

router.patch("/drivers/me/status", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = UpdateDriverStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
  if (driver.isLocked && parsed.data.isOnline) {
    res.status(403).json({ error: "Driver is locked due to cash limit. Please settle your balance." });
    return;
  }
  const [updated] = await db.update(driversTable).set({ isOnline: parsed.data.isOnline }).where(eq(driversTable.userId, sessionUserId)).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  res.json(formatDriver(updated, user));
});

router.patch("/drivers/me/location", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = UpdateDriverLocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(driversTable).set({ currentLat: parsed.data.lat, currentLng: parsed.data.lng }).where(eq(driversTable.userId, sessionUserId));
  res.json({ success: true });
});

router.patch("/drivers/me/photo", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { photoUrl } = req.body;
  if (typeof photoUrl !== "string" || !photoUrl) { res.status(400).json({ error: "photoUrl required" }); return; }
  const [driver] = await db.update(driversTable).set({ photoUrl }).where(eq(driversTable.userId, sessionUserId)).returning();
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  res.json(formatDriver(driver, user));
});

router.get("/drivers/me/wallet", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const allTxns = await db.select().from(walletTransactionsTable).where(eq(walletTransactionsTable.driverId, driver.id));
  const todayTxns = allTxns.filter(t => new Date(t.createdAt) >= today);
  const weekTxns = allTxns.filter(t => new Date(t.createdAt) >= weekAgo);

  const earningsToday = todayTxns.filter(t => t.type === "earning" || t.type === "bonus").reduce((s, t) => s + t.amount, 0);
  const earningsWeek = weekTxns.filter(t => t.type === "earning" || t.type === "bonus").reduce((s, t) => s + t.amount, 0);

  const todayOrders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.driverId, driver.id), eq(ordersTable.status, "delivered")));
  const deliveriesToday = todayOrders.filter(o => new Date(o.createdAt) >= today).length;
  const deliveriesWeek = todayOrders.filter(o => new Date(o.createdAt) >= weekAgo).length;

  const nextMilestone = Math.ceil((driver.totalDeliveries + 1) / 10) * 10;
  const progress = ((driver.totalDeliveries % 10) / 10) * 100;

  res.json({
    walletBalance: driver.walletBalance,
    cashBalance: driver.cashBalance,
    totalEarningsToday: earningsToday,
    totalEarningsWeek: earningsWeek,
    deliveriesToday,
    deliveriesWeek,
    pendingBonus: nextMilestone >= 20 ? 800 : 300,
    cashLimitReached: driver.cashBalance >= CASH_LIMIT,
  });
});

router.get("/drivers/me/wallet/transactions", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
  const txns = await db.select().from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.driverId, driver.id))
    .orderBy(desc(walletTransactionsTable.createdAt));
  res.json(txns);
});

router.get("/drivers/available-jobs", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const availableOrders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.status, "accepted"), isNull(ordersTable.driverId)));
  const withBiz = await Promise.all(availableOrders.map(async (o) => {
    const [biz] = await db.select({ name: businessesTable.name, address: businessesTable.address, phone: businessesTable.phone })
      .from(businessesTable).where(eq(businessesTable.id, o.businessId));
    return {
      id: o.id,
      customerId: o.customerId,
      businessId: o.businessId,
      businessName: biz?.name ?? null,
      businessAddress: biz?.address ?? null,
      businessPhone: biz?.phone ?? null,
      driverId: o.driverId,
      status: o.status,
      totalAmount: o.totalAmount,
      deliveryFee: o.deliveryFee,
      commission: o.commission,
      driverEarnings: o.driverEarnings,
      tip: o.tip,
      paymentMethod: o.paymentMethod,
      isPaid: o.isPaid,
      deliveryAddress: o.deliveryAddress,
      notes: o.notes,
      createdAt: o.createdAt,
      items: [],
    };
  }));
  res.json(withBiz);
});

router.post("/drivers/jobs/:orderId/accept", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const orderId = parseInt(raw, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
  if (driver.isLocked) { res.status(403).json({ error: "Driver is locked" }); return; }
  const [driverUser] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));

  const [order] = await db
    .update(ordersTable)
    .set({ driverId: driver.id })
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.status, "accepted"), isNull(ordersTable.driverId)))
    .returning();
  if (!order) { res.status(409).json({ error: "Order no longer available" }); return; }

  const [biz] = await db.select({ name: businessesTable.name, address: businessesTable.address })
    .from(businessesTable).where(eq(businessesTable.id, order.businessId));

  sendPushToUser(
    order.customerId,
    "🛵 Delivery asignado",
    `${driverUser?.name ?? "Un conductor"} está de camino a recoger tu pedido #${order.id}`,
    `/customer/orders/${order.id}`
  ).catch(() => {});

  const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  res.json({
    id: order.id,
    customerId: order.customerId,
    businessId: order.businessId,
    businessName: biz?.name ?? null,
    businessAddress: biz?.address ?? null,
    driverId: order.driverId,
    status: order.status,
    totalAmount: order.totalAmount,
    deliveryFee: order.deliveryFee,
    commission: order.commission,
    driverEarnings: order.driverEarnings,
    paymentMethod: order.paymentMethod,
    isPaid: order.isPaid,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    createdAt: order.createdAt,
    items: allItems,
  });
});

router.post("/drivers/jobs/:orderId/decline", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json({ success: true });
});

router.get("/driver/active-orders", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
  const activeOrders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.driverId, driver.id), inArray(ordersTable.status, ["accepted", "picked_up"])))
    .orderBy(desc(ordersTable.createdAt));
  const formatted = await Promise.all(activeOrders.map(async (o) => {
    const [biz] = await db.select({ name: businessesTable.name, address: businessesTable.address, phone: businessesTable.phone })
      .from(businessesTable).where(eq(businessesTable.id, o.businessId));
    return {
      id: o.id,
      status: o.status,
      deliveryAddress: o.deliveryAddress,
      totalAmount: o.totalAmount,
      deliveryFee: o.deliveryFee,
      driverEarnings: o.driverEarnings,
      tip: o.tip,
      paymentMethod: o.paymentMethod,
      notes: o.notes,
      deliveryPhotoPath: o.deliveryPhotoPath,
      businessName: biz?.name ?? null,
      businessAddress: biz?.address ?? null,
      businessPhone: biz?.phone ?? null,
    };
  }));
  res.json(formatted);
});

export default router;
