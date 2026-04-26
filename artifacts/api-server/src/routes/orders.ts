import { Router, type IRouter } from "express";
import { eq, and, desc, avg } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, businessesTable, usersTable, driversTable, productsTable, walletTransactionsTable, pointsTransactionsTable, notificationsTable, driverReportsTable, disputesTable, orderMessagesTable } from "@workspace/db";
import { CreateOrderBody, UpdateOrderStatusBody, RateOrderBody, ListOrdersQueryParams } from "@workspace/api-zod";
import { calculateFees, CASH_LIMIT, CASH_WARNING_THRESHOLD } from "../lib/dispatch";
import { sendPushToUser } from "../lib/push";
import { sendWhatsApp } from "../lib/whatsapp";
import { subscribe, emitOrderStatusChange } from "../lib/sse";

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
    createdAt: order.createdAt,
    pickingStatus: order.pickingStatus,
    requiresAgeCheck: order.requiresAgeCheck,
    ageVerified: order.ageVerified,
    scheduledFor: order.scheduledFor,
    items: items.map(i => ({
      id: i.id,
      orderId: i.orderId,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      price: i.price,
      pickerStatus: i.pickerStatus,
      substituteName: i.substituteName,
      substitutePrice: i.substitutePrice,
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

  const isCustomer = user.role === "customer";
  const formatted = await Promise.all(
    allOrders.map(async o => {
      const f = await formatOrder(o);
      return isCustomer ? { ...f, verificationPin: o.verificationPin } : f;
    })
  );
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
  const [viewer] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sessionUserId));
  const formatted = await formatOrder(order);
  const isOwner = viewer?.role === "customer" && order.customerId === sessionUserId;
  res.json(isOwner ? { ...formatted, verificationPin: order.verificationPin } : formatted);
});

// ─── SSE: live order status stream ───────────────────────────────────────────
router.get("/orders/:orderId/stream", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).end(); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).end(); return; }

  // Authorization: only allow the customer, assigned driver, the business owner, or an admin/business
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).end(); return; }
  const [userRow] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (userRow?.role !== "admin") {
    const isCustomer = order.customerId === sessionUserId;
    let isDriver = false;
    if (order.driverId !== null) {
      const [driverRow] = await db.select({ id: driversTable.id }).from(driversTable)
        .where(and(eq(driversTable.id, order.driverId), eq(driversTable.userId, sessionUserId)));
      isDriver = !!driverRow;
    }
    let isBizOwner = false;
    if (userRow?.role === "business") {
      const [bizRow] = await db.select({ id: businessesTable.id }).from(businessesTable)
        .where(and(eq(businessesTable.id, order.businessId), eq(businessesTable.userId, sessionUserId)));
      isBizOwner = !!bizRow;
    }
    if (!isCustomer && !isDriver && !isBizOwner) { res.status(403).end(); return; }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send current status immediately
  if (order) {
    res.write(`event: status\ndata: ${JSON.stringify({ orderId: id, status: order.status, ts: Date.now() })}\n\n`);
  }

  // Keep-alive ping every 25s
  const pingInterval = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(pingInterval); }
  }, 25000);

  const cleanup = subscribe(id, res);

  req.on("close", () => {
    clearInterval(pingInterval);
    cleanup();
  });
});

router.post("/orders", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { businessId, paymentMethod, deliveryAddress, notes, items, tip = 0, orderType = "delivery", pickupAddress, scheduledFor } = parsed.data as any;

  const [biz0] = await db.select({ category: businessesTable.category }).from(businessesTable).where(eq(businessesTable.id, businessId));
  const isPickingBusiness = biz0 && (biz0.category === "supermarket" || biz0.category === "liquor");
  const isLiquor = biz0?.category === "liquor";

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
    pickingStatus: isPickingBusiness ? "in_progress" : "not_required",
    requiresAgeCheck: isLiquor,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
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
      const submittedPin = typeof req.body?.verificationPin === "string" ? req.body.verificationPin : undefined;
      if (!submittedPin || submittedPin.trim() !== existing.verificationPin) {
        res.status(403).json({ error: "PIN incorrecto. Pídele al cliente su PIN de entrega." });
        return;
      }
    }
  }

  // For supermarket/liquor orders accepted by business → go to picking instead of accepted
  let effectiveStatus = parsed.data.status;
  if (parsed.data.status === "accepted") {
    const [existingOrder] = await db.select({ pickingStatus: ordersTable.pickingStatus }).from(ordersTable).where(eq(ordersTable.id, id));
    if (existingOrder?.pickingStatus === "in_progress") {
      effectiveStatus = "picking";
    }
  }

  // Age check: prevent delivery if age not verified for liquor orders
  if (parsed.data.status === "delivered") {
    const [existingOrder] = await db.select({ requiresAgeCheck: ordersTable.requiresAgeCheck, ageVerified: ordersTable.ageVerified }).from(ordersTable).where(eq(ordersTable.id, id));
    if (existingOrder?.requiresAgeCheck && !existingOrder?.ageVerified) {
      res.status(403).json({ error: "Debes verificar la cédula del cliente antes de marcar como entregado." });
      return;
    }
  }

  const updateData: Partial<typeof ordersTable.$inferInsert> = { status: effectiveStatus };
  if (parsed.data.status === "delivered" && (parsed.data as any).deliveryPhotoPath) {
    updateData.deliveryPhotoPath = (parsed.data as any).deliveryPhotoPath;
  }
  const [order] = await db.update(ordersTable).set(updateData).where(eq(ordersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // Instantly push status to any connected SSE clients
  emitOrderStatusChange(id, effectiveStatus);

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

        if (newCashBalance >= CASH_WARNING_THRESHOLD) {
          const [driverUser] = await db.select().from(usersTable).where(eq(usersTable.id, driver.userId));
          if (driverUser?.phone) {
            const name = driverUser.name?.split(" ")[0] ?? "Driver";
            const amountStr = `RD$${Math.round(newCashBalance).toLocaleString()}`;
            const msg = isLocked
              ? `🔒 Hola ${name}, tienes ${amountStr} en efectivo y tu cuenta está *bloqueada*. Por favor pasa a la oficina YaPide AHORA a entregar el efectivo para reactivar tu cuenta. ¡No tomes más pedidos hasta entregar! - YaPide`
              : `⚠️ Hola ${name}, ya tienes ${amountStr} en efectivo. Por favor pasa pronto a la oficina a hacer tu entrega para evitar que tu cuenta sea bloqueada. ¡Seguridad primero! - YaPide`;
            sendWhatsApp(driverUser.phone, msg).catch(() => {});
          }
        }
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

  if (effectiveStatus === "accepted") {
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
    const [customer] = await db.select({ phone: usersTable.phone, name: usersTable.name })
      .from(usersTable).where(eq(usersTable.id, order.customerId));
    if (customer) {
      // Insert notification record first (pending)
      const [notif] = await db.insert(notificationsTable).values({
        orderId: order.id,
        channel: "whatsapp",
        recipientPhone: customer.phone ?? null,
        recipientName: customer.name,
        recipientRole: "customer",
        message: waMsg,
        status: customer.phone ? "pending" : "no_phone",
        sent: false,
      }).returning({ id: notificationsTable.id }).catch(() => []);

      // Actually send via Meta Cloud API if phone is available
      if (customer.phone && notif) {
        const ok = await sendWhatsApp(customer.phone, waMsg);
        await db.update(notificationsTable)
          .set({ sent: ok, status: ok ? "sent" : "failed", sentAt: ok ? new Date() : null })
          .where(eq(notificationsTable.id, notif.id))
          .catch(() => {});
      }
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

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
  if (existing.customerId !== sessionUserId) { res.status(403).json({ error: "Not your order" }); return; }
  if (existing.status !== "delivered") { res.status(400).json({ error: "Can only rate delivered orders" }); return; }
  if (existing.driverRating !== null || existing.businessRating !== null) {
    res.status(409).json({ error: "Ya calificaste este pedido" }); return;
  }

  const [order] = await db.update(ordersTable).set({
    driverRating: parsed.data.driverRating ?? null,
    businessRating: parsed.data.businessRating ?? null,
  }).where(eq(ordersTable.id, id)).returning();

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // Recalculate and update business average rating
  if (parsed.data.businessRating !== undefined && order.businessId) {
    const [result] = await db
      .select({ avgRating: avg(ordersTable.businessRating) })
      .from(ordersTable)
      .where(and(eq(ordersTable.businessId, order.businessId)));
    const newAvg = result?.avgRating ? parseFloat(String(result.avgRating)) : null;
    if (newAvg !== null) {
      await db.update(businessesTable)
        .set({ rating: Math.round(newAvg * 10) / 10 })
        .where(eq(businessesTable.id, order.businessId));
    }
  }

  // Recalculate and update driver average rating
  if (parsed.data.driverRating !== undefined && order.driverId) {
    const [result] = await db
      .select({ avgRating: avg(ordersTable.driverRating) })
      .from(ordersTable)
      .where(and(eq(ordersTable.driverId, order.driverId)));
    const newAvg = result?.avgRating ? parseFloat(String(result.avgRating)) : null;
    if (newAvg !== null) {
      await db.update(driversTable)
        .set({ rating: Math.round(newAvg * 10) / 10 })
        .where(eq(driversTable.id, order.driverId));
    }
  }

  res.json({ success: true });
});

router.post("/orders/:orderId/report-problem", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const { reason, notes } = req.body as { reason: string; notes?: string };
  if (!reason) { res.status(400).json({ error: "reason is required" }); return; }
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
  if (!driver) { res.status(403).json({ error: "Driver only" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.driverId !== driver.id) { res.status(403).json({ error: "Not your order" }); return; }
  const [report] = await db.insert(driverReportsTable).values({ driverId: driver.id, orderId: id, reason, notes: notes ?? null }).returning();
  res.status(201).json(report);
});

router.post("/orders/:orderId/dispute", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const { reason, description } = req.body as { reason: string; description?: string };
  if (!reason) { res.status(400).json({ error: "reason is required" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.customerId !== sessionUserId) { res.status(403).json({ error: "Not your order" }); return; }
  const existing = await db.select().from(disputesTable).where(and(eq(disputesTable.orderId, id), eq(disputesTable.customerId, sessionUserId)));
  if (existing.length) { res.status(409).json({ error: "Ya existe una disputa para este pedido" }); return; }
  const [dispute] = await db.insert(disputesTable).values({ orderId: id, customerId: sessionUserId, reason, description: description ?? null }).returning();
  res.status(201).json(dispute);
});

// ─── Picker: update individual item status ────────────────────────────────────
router.patch("/orders/:orderId/items/:itemId/picker", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orderId = parseInt(req.params.orderId, 10);
  const itemId = parseInt(req.params.itemId, 10);
  if (isNaN(orderId) || isNaN(itemId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // Must be the business owner
  const [biz] = await db.select({ userId: businessesTable.userId }).from(businessesTable).where(eq(businessesTable.id, order.businessId));
  if (!biz || biz.userId !== sessionUserId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { pickerStatus, substituteName, substitutePrice } = req.body as {
    pickerStatus: "found" | "out_of_stock" | "substituted";
    substituteName?: string;
    substitutePrice?: number;
  };
  if (!["found", "out_of_stock", "substituted"].includes(pickerStatus)) {
    res.status(400).json({ error: "Invalid pickerStatus" }); return;
  }

  const [updated] = await db.update(orderItemsTable)
    .set({ pickerStatus, substituteName: substituteName ?? null, substitutePrice: substitutePrice ?? null })
    .where(and(eq(orderItemsTable.id, itemId), eq(orderItemsTable.orderId, orderId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Item not found" }); return; }

  res.json(updated);
});

// ─── Picker: business confirms picking is done ────────────────────────────────
router.post("/orders/:orderId/confirm-picking", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orderId = parseInt(req.params.orderId, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid orderId" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [biz] = await db.select({ userId: businessesTable.userId }).from(businessesTable).where(eq(businessesTable.id, order.businessId));
  if (!biz || biz.userId !== sessionUserId) { res.status(403).json({ error: "Forbidden" }); return; }

  const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  const hasSubs = allItems.some(i => i.pickerStatus === "substituted" || i.pickerStatus === "out_of_stock");

  let newStatus: string;
  let newPickingStatus: string;

  if (hasSubs) {
    newStatus = "pending_substitution";
    newPickingStatus = "pending_approval";
    // Notify customer
    sendPushToUser(order.customerId, "🔄 Cambios en tu pedido", `Algunos artículos de tu pedido #${orderId} necesitan tu aprobación`, `/customer/orders/${orderId}`).catch(() => {});
  } else {
    newStatus = "accepted";
    newPickingStatus = "done";
    // Dispatch to drivers
    const onlineDrivers = await db.select({ userId: driversTable.userId }).from(driversTable).where(eq(driversTable.isOnline, true));
    const [bizName] = await db.select({ name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.id, order.businessId));
    onlineDrivers.forEach(d => {
      sendPushToUser(d.userId, "🛍️ Nuevo delivery disponible", `${bizName?.name ?? "Un negocio"} tiene un pedido listo para recoger`, "/driver/jobs").catch(() => {});
    });
    sendPushToUser(order.customerId, "✅ Pedido listo", `Tu pedido #${orderId} está listo y buscando delivery 🛵`, `/customer/orders/${orderId}`).catch(() => {});
  }

  await db.update(ordersTable).set({ status: newStatus, pickingStatus: newPickingStatus }).where(eq(ordersTable.id, orderId));
  emitOrderStatusChange(orderId, newStatus);

  res.json({ status: newStatus, pickingStatus: newPickingStatus });
});

// ─── Customer: approve substitutions ─────────────────────────────────────────
router.post("/orders/:orderId/approve-substitutions", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orderId = parseInt(req.params.orderId, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid orderId" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.customerId !== sessionUserId) { res.status(403).json({ error: "Not your order" }); return; }

  // approvals: { [itemId]: true | false } — true = accept sub, false = remove item
  const { approvals } = req.body as { approvals: Record<string, boolean> };

  for (const [itemIdStr, accepted] of Object.entries(approvals ?? {})) {
    const itemId = parseInt(itemIdStr, 10);
    if (!accepted) {
      await db.delete(orderItemsTable).where(and(eq(orderItemsTable.id, itemId), eq(orderItemsTable.orderId, orderId)));
    }
  }

  // Move to accepted → dispatch to drivers
  await db.update(ordersTable).set({ status: "accepted", pickingStatus: "done" }).where(eq(ordersTable.id, orderId));
  emitOrderStatusChange(orderId, "accepted");

  const onlineDrivers = await db.select({ userId: driversTable.userId }).from(driversTable).where(eq(driversTable.isOnline, true));
  const [bizName] = await db.select({ name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.id, order.businessId));
  onlineDrivers.forEach(d => {
    sendPushToUser(d.userId, "🛍️ Nuevo delivery disponible", `${bizName?.name ?? "Un negocio"} tiene un pedido listo para recoger`, "/driver/jobs").catch(() => {});
  });

  res.json({ status: "accepted" });
});

// ─── Driver: mark age verified ────────────────────────────────────────────────
router.patch("/orders/:orderId/age-verified", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orderId = parseInt(req.params.orderId, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid orderId" }); return; }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, sessionUserId));
  if (!driver) { res.status(403).json({ error: "Driver only" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.driverId !== driver.id) { res.status(403).json({ error: "Not your order" }); return; }

  await db.update(ordersTable).set({ ageVerified: true }).where(eq(ordersTable.id, orderId));
  res.json({ ageVerified: true });
});

router.get("/orders/:orderId/messages", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orderId = parseInt(req.params.orderId, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  const driver = await db.select({ id: driversTable.id }).from(driversTable).where(eq(driversTable.userId, sessionUserId));
  const driverIds = driver.map(d => d.id);
  const isParty = order.customerId === sessionUserId || driverIds.some(d => d === order.driverId);
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!isParty && user?.role !== "admin" && user?.role !== "business") { res.status(403).json({ error: "Forbidden" }); return; }
  const messages = await db.select().from(orderMessagesTable)
    .where(eq(orderMessagesTable.orderId, orderId))
    .orderBy(orderMessagesTable.createdAt);
  res.json(messages);
});

router.post("/orders/:orderId/messages", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orderId = parseInt(req.params.orderId, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const { body } = req.body as { body: string };
  if (!body?.trim()) { res.status(400).json({ error: "body required" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  const driver = await db.select({ id: driversTable.id }).from(driversTable).where(eq(driversTable.userId, sessionUserId));
  const driverIds = driver.map(d => d.id);
  const isParty = order.customerId === sessionUserId || driverIds.some(d => d === order.driverId);
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!isParty && user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const role = user?.role ?? "customer";
  const [msg] = await db.insert(orderMessagesTable).values({ orderId, senderId: sessionUserId, senderRole: role, body: body.trim() }).returning();
  res.status(201).json(msg);
});

export default router;
