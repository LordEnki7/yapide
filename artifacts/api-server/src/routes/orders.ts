import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, businessesTable, usersTable, driversTable, productsTable, walletTransactionsTable, pointsTransactionsTable } from "@workspace/db";
import { CreateOrderBody, UpdateOrderStatusBody, RateOrderBody, ListOrdersQueryParams } from "@workspace/api-zod";
import { calculateFees, CASH_LIMIT } from "../lib/dispatch";

const router: IRouter = Router();

async function formatOrder(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, order.businessId));
  const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, order.customerId));
  let driver = null;
  if (order.driverId) {
    const [d] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId));
    if (d) {
      const [dUser] = await db.select().from(usersTable).where(eq(usersTable.id, d.userId));
      driver = { ...d, user: dUser };
    }
  }
  return {
    id: order.id,
    customerId: order.customerId,
    businessId: order.businessId,
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
    customerRating: order.customerRating,
    driverRating: order.driverRating,
    businessRating: order.businessRating,
    createdAt: order.createdAt,
    items: items.map(i => ({
      id: i.id,
      orderId: i.orderId,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      price: i.price,
    })),
    business: business ? {
      id: business.id,
      userId: business.userId,
      name: business.name,
      category: business.category,
      description: business.description,
      address: business.address,
      phone: business.phone,
      imageUrl: business.imageUrl,
      lat: business.lat,
      lng: business.lng,
      isActive: business.isActive,
      rating: business.rating,
      totalOrders: business.totalOrders,
      createdAt: business.createdAt,
    } : null,
    customer: customer ? {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      role: customer.role,
      isBanned: customer.isBanned,
      createdAt: customer.createdAt,
    } : null,
    driver,
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = ListOrdersQueryParams.safeParse(req.query);
  let allOrders: (typeof ordersTable.$inferSelect)[] = [];

  if (user.role === "customer") {
    allOrders = await db.select().from(ordersTable).where(eq(ordersTable.customerId, sessionUserId)).orderBy(desc(ordersTable.createdAt));
  } else if (user.role === "driver") {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
    if (driver) {
      allOrders = await db.select().from(ordersTable).where(eq(ordersTable.driverId, driver.id)).orderBy(desc(ordersTable.createdAt));
    }
  } else if (user.role === "business") {
    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.userId, sessionUserId));
    if (business) {
      allOrders = await db.select().from(ordersTable).where(eq(ordersTable.businessId, business.id)).orderBy(desc(ordersTable.createdAt));
    }
  } else if (user.role === "admin") {
    allOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  }

  if (params.success && params.data.status) {
    allOrders = allOrders.filter(o => o.status === params.data.status);
  }
  if (params.success && params.data.limit) {
    allOrders = allOrders.slice(0, params.data.limit);
  }

  const formatted = await Promise.all(allOrders.map(formatOrder));
  res.json(formatted);
});

router.get("/orders/:orderId", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(await formatOrder(order));
});

router.post("/orders", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { businessId, paymentMethod, deliveryAddress, notes, items, tip = 0 } = parsed.data as any;

  let baseAmount = 0;
  const itemDetails: Array<{ productId: number; productName: string; quantity: number; price: number }> = [];

  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) { res.status(404).json({ error: `Product ${item.productId} not found` }); return; }
    baseAmount += product.price * item.quantity;
    itemDetails.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
    });
  }

  const { totalAmount, deliveryFee, commission, driverEarnings } = calculateFees(baseAmount, 3, tip ?? 0);

  const [order] = await db.insert(ordersTable).values({
    customerId: sessionUserId,
    businessId,
    paymentMethod,
    deliveryAddress,
    notes: notes ?? null,
    totalAmount,
    deliveryFee,
    commission,
    driverEarnings,
    tip: tip ?? 0,
    status: "pending",
    isPaid: paymentMethod === "card",
  }).returning();

  for (const item of itemDetails) {
    await db.insert(orderItemsTable).values({ orderId: order.id, ...item });
  }

  await db.update(businessesTable).set({ totalOrders: businessesTable.totalOrders }).where(eq(businessesTable.id, businessId));

  const pointsEarned = Math.floor(baseAmount / 10);
  if (pointsEarned > 0) {
    await db.update(usersTable).set({ points: (await db.select({ points: usersTable.points }).from(usersTable).where(eq(usersTable.id, sessionUserId)))[0].points + pointsEarned }).where(eq(usersTable.id, sessionUserId));
    await db.insert(pointsTransactionsTable).values({
      userId: sessionUserId,
      orderId: order.id,
      type: "earn",
      amount: pointsEarned,
      description: `Pedido #${order.id} · RD$${totalAmount.toFixed(0)}`,
    });
  }

  res.status(201).json(await formatOrder(order));
});

router.patch("/orders/:orderId/status", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (parsed.data.status === "delivered" && order.driverId) {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId));
    if (driver) {
      const tipAmount = order.tip ?? 0;
      const newCashBalance = order.paymentMethod === "cash" ? driver.cashBalance + order.totalAmount + order.deliveryFee + tipAmount : driver.cashBalance;
      const newWalletBalance = driver.walletBalance + order.driverEarnings;
      const newTotalDeliveries = driver.totalDeliveries + 1;
      const isLocked = newCashBalance > CASH_LIMIT;

      await db.update(driversTable).set({
        cashBalance: newCashBalance,
        walletBalance: newWalletBalance,
        totalDeliveries: newTotalDeliveries,
        isLocked,
      }).where(eq(driversTable.id, driver.id));

      await db.insert(walletTransactionsTable).values({
        driverId: driver.id,
        type: "earning",
        amount: order.driverEarnings,
        description: `Delivery #${order.id} — 50% tarifa (RD$${(order.driverEarnings - tipAmount).toFixed(0)}) + propina (RD$${tipAmount.toFixed(0)})`,
      });

      if (order.paymentMethod === "cash") {
        await db.insert(walletTransactionsTable).values({
          driverId: driver.id,
          type: "cash_collected",
          amount: order.totalAmount + order.deliveryFee + tipAmount,
          description: `Cash collected for order #${order.id}`,
        });
      }

      const tenDeliveryMilestones = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      if (tenDeliveryMilestones.includes(newTotalDeliveries)) {
        const bonus = newTotalDeliveries >= 20 ? 800 : 300;
        await db.update(driversTable).set({ walletBalance: newWalletBalance + bonus }).where(eq(driversTable.id, driver.id));
        await db.insert(walletTransactionsTable).values({
          driverId: driver.id,
          type: "bonus",
          amount: bonus,
          description: `${newTotalDeliveries} deliveries milestone bonus!`,
        });
      }
    }
  }

  res.json(await formatOrder(order));
});

router.post("/orders/:orderId/rate", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const parsed = RateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.update(ordersTable).set({
    driverRating: parsed.data.driverRating,
    businessRating: parsed.data.businessRating,
  }).where(eq(ordersTable.id, id)).returning();

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ success: true });
});

export default router;
