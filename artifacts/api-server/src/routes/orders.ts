import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, businessesTable, usersTable, driversTable, productsTable, walletTransactionsTable, pointsTransactionsTable, notificationsTable } from "@workspace/db";
import { CreateOrderBody, UpdateOrderStatusBody, RateOrderBody, ListOrdersQueryParams } from "@workspace/api-zod";
import { calculateFees, CASH_LIMIT } from "../lib/dispatch";
import { sendPushToUser } from "../lib/push";

const formatDOP = (n: number) => `RD$ ${Math.round(n).toLocaleString("es-DO")}`;

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
    deliveryPhotoPath: order.deliveryPhotoPath,
    promoCode: order.promoCode,
    promoDiscount: order.promoDiscount,
    orderType: order.orderType,
    pickupAddress: order.pickupAddress,
    verificationPin: order.verificationPin,
    createdAt: order.createdAt,
    items: items.map(i => ({
      id: i.id,
      orderId: i.orderId,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      price: i.price,
    })),
    estimatedMinutes: business ? ((business.prepTimeMinutes ?? 20) + 20) : 40,
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
      prepTimeMinutes: business.prepTimeMinutes,
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

  const { businessId, paymentMethod, deliveryAddress, notes, items, tip = 0, orderType = "delivery", pickupAddress } = parsed.data as any;

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

  const verificationPin = String(Math.floor(1000 + Math.random() * 9000));

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
    orderType: orderType ?? "delivery",
    pickupAddress: pickupAddress ?? null,
    verificationPin,
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

  const formatted = await formatOrder(order);

  const [biz] = await db.select({ userId: businessesTable.userId, name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (biz) {
    sendPushToUser(biz.userId, "🛍️ Nuevo pedido", `Pedido #${order.id} — ${formatDOP(order.totalAmount)}`, "/business/orders").catch(() => {});
  }

  res.status(201).json(formatted);
});

router.patch("/orders/:orderId/status", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // PIN verification on delivery
  if (parsed.data.status === "delivered") {
    const [existing] = await db.select({ verificationPin: ordersTable.verificationPin }).from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    if (existing.verificationPin) {
      const submittedPin = (parsed.data as any).verificationPin as string | undefined;
      if (!submittedPin || submittedPin.trim() !== existing.verificationPin) {
        res.status(403).json({ error: "PIN incorrecto. Pídele al cliente su PIN de entrega." });
        return;
      }
    }
  }

  const updateData: Partial<typeof ordersTable.$inferInsert> = { status: parsed.data.status };
  if (parsed.data.status === "delivered" && (parsed.data as any).deliveryPhotoPath) {
    updateData.deliveryPhotoPath = (parsed.data as any).deliveryPhotoPath;
  }
  const [order] = await db.update(ordersTable).set(updateData).where(eq(ordersTable.id, id)).returning();
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

  const statusPushMap: Record<string, { title: string; body: string; url: string }> = {
    accepted: { title: "✅ Pedido confirmado", body: `Tu pedido #${order.id} fue confirmado. Buscando delivery…`, url: `/customer/orders/${order.id}` },
    picked_up: { title: "🛵 Pedido recogido", body: `Tu pedido #${order.id} está en camino. ¡Ya llegó!`, url: `/customer/orders/${order.id}` },
    delivered: { title: "🎉 ¡Pedido entregado!", body: `Tu pedido #${order.id} fue entregado. ¡Buen provecho!`, url: `/customer/orders/${order.id}` },
    cancelled: { title: "❌ Pedido cancelado", body: `Tu pedido #${order.id} fue cancelado.`, url: `/customer/orders/${order.id}` },
  };
  const pushInfo = statusPushMap[parsed.data.status];
  if (pushInfo) {
    sendPushToUser(order.customerId, pushInfo.title, pushInfo.body, pushInfo.url).catch(() => {});
  }

  if (parsed.data.status === "accepted") {
    const [biz] = await db.select({ name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.id, order.businessId));
    const onlineDrivers = await db.select({ userId: driversTable.userId }).from(driversTable).where(eq(driversTable.isOnline, true));
    onlineDrivers.forEach(d => {
      sendPushToUser(d.userId, "🛍️ Nuevo delivery disponible", `${biz?.name ?? "Un negocio"} tiene un pedido listo para recoger`, "/driver/jobs").catch(() => {});
    });
  }

  // ─── WhatsApp notification log ───────────────────────────────────────────
  const waMessages: Record<string, string> = {
    accepted: `✅ ¡Tu pedido #${order.id} fue confirmado! ${order.business ? `*${(order as any).business?.name}* está` : "El negocio está"} preparando tu pedido. Tiempo estimado: ~40 min. Sigue en vivo: yapide.app 🛵`,
    picked_up: `🛵 ¡Tu pedido #${order.id} está en camino! Tu driver ya recogió y va hacia ti. ¡Llega en ~20 min! Sigue en vivo: yapide.app`,
    delivered: `🎉 ¡Tu pedido #${order.id} fue entregado! ¡Buen provecho! Califica tu experiencia en la app. ¡Gracias por usar YaPide! 🙌`,
    cancelled: `❌ Tu pedido #${order.id} fue cancelado. Si fue un error, puedes hacer un nuevo pedido en yapide.app. ¿Necesitas ayuda? WhatsApp: +1-809-000-0000 | Email: info@yapide.app`,
  };

  const waMsg = waMessages[parsed.data.status];
  if (waMsg) {
    const [customer] = await db.select({ phone: usersTable.phone, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.customerId));
    if (customer) {
      await db.insert(notificationsTable).values({
        orderId: order.id,
        channel: "whatsapp",
        recipientPhone: customer.phone ?? null,
        recipientName: customer.name,
        recipientRole: "customer",
        message: waMsg,
        status: customer.phone ? "pending" : "no_phone",
        sent: false,
      }).catch(() => {});
    }
  }

  res.json(await formatOrder(order));
});

router.get("/orders/:orderId/driver-location", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order || order.customerId !== sessionUserId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!order.driverId) { res.status(404).json({ error: "No driver assigned" }); return; }
  const [driver] = await db.select({ currentLat: driversTable.currentLat, currentLng: driversTable.currentLng })
    .from(driversTable).where(eq(driversTable.id, order.driverId));
  if (!driver || driver.currentLat == null || driver.currentLng == null) {
    res.status(404).json({ error: "Location unavailable" }); return;
  }
  res.json({ lat: driver.currentLat, lng: driver.currentLng });
});

router.patch("/orders/:orderId/notes", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.customerId !== sessionUserId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (order.status !== "pending") { res.status(409).json({ error: "Solo puedes editar notas de pedidos pendientes" }); return; }
  const { notes } = req.body as { notes: string };
  const [updated] = await db.update(ordersTable).set({ notes: notes ?? null }).where(eq(ordersTable.id, id)).returning();
  res.json(await formatOrder(updated));
});

router.post("/orders/:orderId/cancel", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.customerId !== sessionUserId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (order.status !== "pending") {
    res.status(409).json({ error: "Solo puedes cancelar pedidos pendientes" });
    return;
  }
  const [updated] = await db.update(ordersTable).set({ status: "cancelled" }).where(eq(ordersTable.id, id)).returning();
  sendPushToUser(order.customerId, "❌ Pedido cancelado", `Tu pedido #${order.id} fue cancelado.`, `/customer/orders/${order.id}`).catch(() => {});
  res.json(await formatOrder(updated));
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
