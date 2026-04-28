import { Router, type IRouter } from "express";
import { eq, desc, gte, and, isNull } from "drizzle-orm";
import { db, ordersTable, driversTable, usersTable, businessesTable, orderItemsTable, productsTable, bannersTable, deliveryWindowsTable, pointsEventsTable, businessPayoutsTable, driverDepositsTable } from "@workspace/db";
let _openai: any = null;
async function getOpenAI() {
  if (!_openai) {
    const mod = await import("@workspace/integrations-openai-ai-server");
    _openai = mod.openai;
  }
  return _openai;
}

const router: IRouter = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// ─── 1. DISPATCH AGENT ──────────────────────────────────────────────────────
router.get("/agents/dispatch/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const unassigned = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.status, "accepted"), isNull(ordersTable.driverId)));

  const onlineDrivers = await db.select().from(driversTable)
    .where(and(eq(driversTable.isOnline, true), eq(driversTable.isLocked, false)));

  const recommendations: Array<{ orderId: number; driverId: number; driverName: string; score: number }> = [];

  for (const order of unassigned) {
    if (onlineDrivers.length === 0) break;
    let bestDriver = onlineDrivers[0];
    let bestScore = -1;
    for (const d of onlineDrivers) {
      const score = (d.rating ?? 4.5) * 20 + (d.acceptanceRate ?? 80) * 0.5 + (d.totalDeliveries > 100 ? 10 : d.totalDeliveries / 10);
      if (score > bestScore) { bestScore = score; bestDriver = d; }
    }
    const [dUser] = await db.select().from(usersTable).where(eq(usersTable.id, bestDriver.userId));
    recommendations.push({ orderId: order.id, driverId: bestDriver.id, driverName: dUser?.name ?? "Driver", score: Math.round(bestScore) });
  }

  res.json({
    unassignedOrders: unassigned.length,
    availableDrivers: onlineDrivers.length,
    recommendations,
    status: unassigned.length === 0 ? "idle" : onlineDrivers.length === 0 ? "no_drivers" : "active",
    lastRun: new Date().toISOString(),
  });
});

// Execute dispatch — auto-assign best driver to an unassigned order
router.post("/agents/dispatch/run", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const unassigned = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.status, "accepted"), isNull(ordersTable.driverId)));

  const onlineDrivers = await db.select().from(driversTable)
    .where(and(eq(driversTable.isOnline, true), eq(driversTable.isLocked, false)));

  if (onlineDrivers.length === 0) { res.json({ dispatched: 0, message: "No drivers available" }); return; }

  let dispatched = 0;
  for (const order of unassigned) {
    let bestDriver = onlineDrivers[0];
    let bestScore = -1;
    for (const d of onlineDrivers) {
      const score = (d.rating ?? 4.5) * 20 + (d.acceptanceRate ?? 80) * 0.5;
      if (score > bestScore) { bestScore = score; bestDriver = d; }
    }
    await db.update(ordersTable).set({ driverId: bestDriver.id }).where(eq(ordersTable.id, order.id));
    dispatched++;
  }

  res.json({ dispatched, message: `Auto-dispatched ${dispatched} order(s)` });
});

// ─── 2. FRAUD DETECTION AGENT ────────────────────────────────────────────────
router.get("/agents/fraud/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const allOrders = await db.select().from(ordersTable).where(gte(ordersTable.createdAt, sevenDaysAgo));
  const allUsers = await db.select().from(usersTable);

  const alerts: Array<{ type: string; severity: "high" | "medium" | "low"; description: string; entityId?: number; entityName?: string }> = [];

  // Serial cancellers
  const cancelsByCustomer: Record<number, number> = {};
  for (const o of allOrders) {
    if (o.status === "cancelled") {
      cancelsByCustomer[o.customerId] = (cancelsByCustomer[o.customerId] ?? 0) + 1;
    }
  }
  for (const [uid, count] of Object.entries(cancelsByCustomer)) {
    if (count >= 3) {
      const user = allUsers.find(u => u.id === parseInt(uid));
      alerts.push({ type: "serial_canceller", severity: count >= 5 ? "high" : "medium", description: `${count} cancellations in 7 days`, entityId: parseInt(uid), entityName: user?.name ?? "Unknown" });
    }
  }

  // Promo code abuse
  const promoByCustomer: Record<number, number> = {};
  for (const o of allOrders) {
    if ((o as any).promoCode) {
      promoByCustomer[o.customerId] = (promoByCustomer[o.customerId] ?? 0) + 1;
    }
  }
  for (const [uid, count] of Object.entries(promoByCustomer)) {
    if (count >= 3) {
      const user = allUsers.find(u => u.id === parseInt(uid));
      alerts.push({ type: "promo_abuse", severity: "medium", description: `Used promo codes ${count} times this week`, entityId: parseInt(uid), entityName: user?.name ?? "Unknown" });
    }
  }

  // High-value orders from new accounts
  for (const o of allOrders) {
    if (o.totalAmount > 3000) {
      const user = allUsers.find(u => u.id === o.customerId);
      if (user && new Date(user.createdAt) >= sevenDaysAgo) {
        alerts.push({ type: "high_value_new_account", severity: "high", description: `RD$${Math.round(o.totalAmount)} order from account < 7 days old`, entityId: user.id, entityName: user.name });
      }
    }
  }

  // Locked drivers still trying to be active
  const lockedDrivers = await db.select().from(driversTable).where(and(eq(driversTable.isLocked, true), eq(driversTable.isOnline, true)));
  for (const d of lockedDrivers) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, d.userId));
    alerts.push({ type: "locked_driver_online", severity: "high", description: `Locked driver is marked online (cash: RD$${Math.round(d.cashBalance)})`, entityId: d.id, entityName: u?.name });
  }

  res.json({
    totalAlerts: alerts.length,
    highSeverity: alerts.filter(a => a.severity === "high").length,
    alerts: alerts.sort((a, b) => (a.severity === "high" ? -1 : 1)),
    status: alerts.length === 0 ? "clean" : alerts.some(a => a.severity === "high") ? "critical" : "warning",
    lastRun: new Date().toISOString(),
  });
});

// ─── 3. SURGE PRICING AGENT ──────────────────────────────────────────────────
router.get("/agents/surge/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const [pending, active, onlineDrivers] = await Promise.all([
    db.select().from(ordersTable).where(eq(ordersTable.status, "pending")),
    db.select().from(ordersTable).where(eq(ordersTable.status, "accepted")),
    db.select().from(driversTable).where(eq(driversTable.isOnline, true)),
  ]);

  const demand = pending.length + active.length;
  const supply = onlineDrivers.length;
  const ratio = supply === 0 ? 99 : demand / supply;
  const surgeMultiplier = ratio > 3 ? 1.5 : ratio > 2 ? 1.25 : ratio > 1.5 ? 1.1 : 1.0;
  const isSurge = surgeMultiplier > 1.0;

  const hour = new Date().getHours();
  const isPeakHour = (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21);

  res.json({
    pendingOrders: pending.length,
    activeOrders: active.length,
    onlineDrivers: supply,
    demandSupplyRatio: Math.round(ratio * 100) / 100,
    surgeMultiplier,
    isSurge,
    isPeakHour,
    recommendation: isSurge ? `Send push to offline drivers. Suggested ${surgeMultiplier}x delivery fee multiplier.` : supply === 0 && demand > 0 ? "No drivers available — push all offline drivers now!" : "Supply is healthy. No surge needed.",
    status: isSurge ? "surge" : demand === 0 ? "quiet" : "normal",
    lastRun: new Date().toISOString(),
  });
});

// ─── 4. ETA AGENT ────────────────────────────────────────────────────────────
router.get("/agents/eta/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const recentDelivered = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))));

  const businesses = await db.select().from(businessesTable);
  const avgPrepTime = businesses.reduce((s, b) => s + (b.prepTimeMinutes ?? 20), 0) / Math.max(businesses.length, 1);

  const hour = new Date().getHours();
  const trafficMultiplier = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19) ? 1.3 : 1.0;

  const activeOrders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.status, "accepted"), isNull(ordersTable.driverId)));

  const baseDelivery = 20;
  const adjustedDelivery = Math.round(baseDelivery * trafficMultiplier);
  const suggestedETA = Math.round(avgPrepTime + adjustedDelivery);

  res.json({
    avgPrepTimeAcrossBusinesses: Math.round(avgPrepTime),
    trafficMultiplier,
    suggestedBaseETA: suggestedETA,
    unassignedOrders: activeOrders.length,
    totalDeliveredThisWeek: recentDelivered.length,
    status: "active",
    lastRun: new Date().toISOString(),
    note: `During ${trafficMultiplier > 1 ? "peak" : "normal"} traffic. Recommended ETA: ~${suggestedETA} min.`,
  });
});

// ─── 5. MENU OPTIMIZER AGENT ─────────────────────────────────────────────────
router.get("/agents/menu-optimizer/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const allItems = await db.select().from(orderItemsTable);
  const allProducts = await db.select().from(productsTable);
  const recentOrders = await db.select().from(ordersTable).where(gte(ordersTable.createdAt, thirtyDaysAgo));
  const recentOrderIds = new Set(recentOrders.map(o => o.id));
  const recentItems = allItems.filter(i => recentOrderIds.has(i.orderId));

  const soldCounts: Record<number, number> = {};
  for (const item of recentItems) {
    if (item.productId) soldCounts[item.productId] = (soldCounts[item.productId] ?? 0) + item.quantity;
  }

  const insights: Array<{ type: string; severity: "high" | "medium" | "low"; productName: string; productId: number; description: string }> = [];

  for (const product of allProducts) {
    const sales = soldCounts[product.id] ?? 0;
    if (sales === 0) {
      insights.push({ type: "dead_product", severity: "high", productName: product.name, productId: product.id, description: "0 orders in the last 30 days — consider removing or promoting." });
    } else if (sales < 3) {
      insights.push({ type: "slow_mover", severity: "medium", productName: product.name, productId: product.id, description: `Only ${sales} sold in 30 days — consider a discount or feature.` });
    }
    if (!product.isAvailable) {
      insights.push({ type: "out_of_stock", severity: "high", productName: product.name, productId: product.id, description: "Currently out of stock — revenue being lost." });
    }
  }

  const topProducts = Object.entries(soldCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, qty]) => {
      const p = allProducts.find(p => p.id === parseInt(id));
      return { productId: parseInt(id), productName: p?.name ?? "Unknown", quantitySold: qty };
    });

  res.json({
    totalProducts: allProducts.length,
    activeProducts: allProducts.filter(p => !!p.isAvailable).length,
    outOfStock: allProducts.filter(p => !p.isAvailable).length,
    insights: insights.sort((a, b) => a.severity === "high" ? -1 : 1),
    topProducts,
    status: insights.some(i => i.severity === "high") ? "action_needed" : "good",
    lastRun: new Date().toISOString(),
  });
});

// ─── 6. CUSTOMER SUPPORT AGENT (AI-powered) ──────────────────────────────────
router.post("/agents/support/ask", async (req, res): Promise<void> => {
  const { question, orderId, userId, history } = req.body ?? {};
  if (!question) { res.status(400).json({ error: "question required" }); return; }

  let orderContext = "";
  let orderInfo: any = null;

  // Fetch order context if an order ID was provided
  if (orderId) {
    const id = parseInt(orderId, 10);
    if (!isNaN(id)) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
      if (order) {
        const statusLabels: Record<string, string> = {
          pending: "pendiente — esperando confirmación del negocio",
          accepted: "confirmado — siendo preparado",
          picked_up: "en camino con el driver",
          delivered: "entregado",
          cancelled: "cancelado",
        };
        orderInfo = { id: order.id, status: order.status, statusLabel: statusLabels[order.status] ?? order.status };
        orderContext = `El cliente está preguntando sobre su pedido #${order.id}. Estado actual: ${statusLabels[order.status] ?? order.status}. Monto total: RD$${Math.round(order.totalAmount + order.deliveryFee)}.`;
      }
    }
  }

  // Build conversation history for context
  const chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (Array.isArray(history)) {
    for (const msg of history.slice(-6)) {
      if (msg.role === "user" || msg.role === "assistant") {
        chatHistory.push({ role: msg.role, content: String(msg.content) });
      }
    }
  }

  const systemPrompt = `Eres el asistente virtual de YaPide, una app dominicana de delivery. Tu nombre es "YaBot".

Información clave sobre YaPide:
- Operamos en 5 ciudades dominicanas: Santo Domingo, Santiago, La Romana, San Pedro de Macorís, Puerto Plata
- Costo de delivery: RD$150
- Tiempo estimado: 30–60 minutos (preparación + entrega)
- Pagamos con efectivo. Tarjeta próximamente.
- Los clientes ganan 1 punto por cada RD$10 gastados, canjeables por descuentos
- Solo se puede cancelar un pedido si está en estado "pendiente"
- Para soporte urgente: WhatsApp +1-809-000-0000 o email info@yapide.app

${orderContext ? `\nContexto del pedido del cliente:\n${orderContext}` : ""}

Responde siempre en español dominicano, de manera amable, directa y breve (máximo 3 oraciones). Si el cliente escribe en inglés, responde en inglés. Si no puedes resolver su problema, ofrece el WhatsApp de soporte.`;

  try {
    const completion = await (await getOpenAI()).chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: question },
      ],
      max_tokens: 300,
    });

    const rawAnswer = completion.choices[0]?.message?.content;
    const answer = rawAnswer && rawAnswer.trim()
      ? rawAnswer.trim()
      : "No pude procesar tu pregunta. Por favor intenta de nuevo o contáctanos por WhatsApp.";
    const escalate = answer.toLowerCase().includes("whatsapp") || answer.toLowerCase().includes("soporte");

    res.json({ answer, orderInfo, escalate });
  } catch (err: any) {
    console.error("Support AI error:", err?.message ?? err);
    // Fallback to a basic response if AI fails
    res.json({
      answer: "Estoy teniendo dificultades técnicas. Para ayuda inmediata, contáctanos por WhatsApp +1-809-000-0000.",
      orderInfo,
      escalate: true,
    });
  }
});

// ─── MONITORING OVERVIEW ──────────────────────────────────────────────────────
router.get("/agents/overview", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [allOrders, allDrivers, allBusinesses, allUsers] = await Promise.all([
    db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)),
    db.select().from(driversTable),
    db.select().from(businessesTable),
    db.select().from(usersTable),
  ]);

  const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= todayStart);
  const weekOrders = allOrders.filter(o => new Date(o.createdAt) >= weekAgo);
  const deliveredToday = todayOrders.filter(o => o.status === "delivered");
  const deliveredWeek = weekOrders.filter(o => o.status === "delivered");

  const revenueToday = deliveredToday.reduce((s, o) => s + o.commission, 0);
  const revenueWeek = deliveredWeek.reduce((s, o) => s + o.commission, 0);
  const revenueTotal = allOrders.filter(o => o.status === "delivered").reduce((s, o) => s + o.commission, 0);

  const gmvToday = deliveredToday.reduce((s, o) => s + o.totalAmount + o.deliveryFee, 0);
  const gmvWeek = deliveredWeek.reduce((s, o) => s + o.totalAmount + o.deliveryFee, 0);

  const onlineDrivers = allDrivers.filter(d => d.isOnline);
  const lockedDrivers = allDrivers.filter(d => d.isLocked);

  const pipeline = {
    pending: allOrders.filter(o => o.status === "pending").length,
    accepted: allOrders.filter(o => o.status === "accepted").length,
    picked_up: allOrders.filter(o => o.status === "picked_up").length,
  };

  const prevWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekOrders = allOrders.filter(o => new Date(o.createdAt) >= prevWeekStart && new Date(o.createdAt) < weekAgo);
  const ordersGrowth = prevWeekOrders.length === 0 ? 100 : Math.round(((weekOrders.length - prevWeekOrders.length) / prevWeekOrders.length) * 100);

  const dailyStats: Array<{ date: string; orders: number; revenue: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    const dayOrders = allOrders.filter(o => { const d = new Date(o.createdAt); return d >= day && d < nextDay; });
    dailyStats.push({
      date: day.toLocaleDateString("es-DO", { weekday: "short", month: "short", day: "numeric" }),
      orders: dayOrders.length,
      revenue: dayOrders.filter(o => o.status === "delivered").reduce((s, o) => s + o.commission, 0),
    });
  }

  const recentOrders = await Promise.all(allOrders.slice(0, 10).map(async o => {
    const [biz] = await db.select({ name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.id, o.businessId));
    return { id: o.id, status: o.status, totalAmount: o.totalAmount, businessName: biz?.name, createdAt: o.createdAt };
  }));

  res.json({
    kpi: {
      revenueToday, revenueWeek, revenueTotal,
      gmvToday, gmvWeek,
      ordersToday: todayOrders.length, ordersWeek: weekOrders.length, ordersTotal: allOrders.length,
      ordersGrowthPct: ordersGrowth,
      deliveryRateToday: todayOrders.length === 0 ? 0 : Math.round((deliveredToday.length / todayOrders.length) * 100),
    },
    users: { total: allUsers.filter(u => u.role === "customer").length, banned: allUsers.filter(u => u.isBanned).length },
    drivers: { total: allDrivers.length, online: onlineDrivers.length, locked: lockedDrivers.length },
    businesses: { total: allBusinesses.length, active: allBusinesses.filter(b => b.isActive).length },
    pipeline,
    dailyStats,
    recentOrders,
    generatedAt: now.toISOString(),
  });
});

// ─── PROMO AI AGENT ─────────────────────────────────────────────────────────

const PROMO_SYSTEM_PROMPT = `You are a promotions manager for YaPide, a Dominican food delivery app.
The admin speaks English. You convert their plain-English promo ideas into structured Spanish promotions.

You must return ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "summary": "Short English summary of what you understood",
  "actions": [
    // Include only the action types that are relevant to the request.
    // You can include multiple actions (e.g. a delivery window + a matching banner).
    {
      "type": "delivery_window",
      "label": "Free Delivery Window",
      "data": {
        "name": "Spanish name for this window",
        "dayOfWeek": null,        // 0=Sun,1=Mon,...,6=Sat — null means every day
        "specificDate": null,     // "YYYY-MM-DD" if a specific date
        "startTime": "HH:MM",    // 24-hour format
        "endTime": "HH:MM"
      }
    },
    {
      "type": "banner",
      "label": "Promotional Banner",
      "data": {
        "title": "Spanish banner title (max 40 chars, punchy)",
        "subtitle": "Spanish subtitle (max 60 chars)",
        "bgColor": "#hex",        // Pick a color that matches the mood
        "ctaText": "Spanish CTA button text",
        "ctaLink": "/customer"
      }
    },
    {
      "type": "points_event",
      "label": "Points Multiplier",
      "data": {
        "name": "Spanish name for this event",
        "multiplier": 2,          // number like 2, 3, 5
        "startsAt": "ISO datetime",
        "endsAt": "ISO datetime"
      }
    },
    {
      "type": "push",
      "label": "Push Notification",
      "data": {
        "title": "Spanish push title",
        "body": "Spanish push body message",
        "segment": "all"          // "all" | "inactive" | "new"
      }
    },
    {
      "type": "qr_code",
      "label": "QR Code",
      "data": {
        "targetPath": "/promo/CODE",
        "promoCode": null,
        "description": "Spanish description of what this QR does"
      }
    }
  ]
}

Color guide for banners: free delivery → #16a34a (green), points/rewards → #0057B7 (blue), special events → #dc2626 (red), general promos → #9333ea (purple).
Today is ${new Date().toISOString()}. Use this to calculate datetimes when the admin says things like "this weekend" or "tonight".
Dominican week starts on Sunday. Business peak hours are 11AM-2PM and 6PM-10PM.
When generating a QR code for a promo code, use targetPath "/promo/{CODE}" and set promoCode to the code string. When asked for a QR to download the app, use targetPath "/register". Always pair a QR code with at least one other action (a banner or push) unless the user only asks for a QR.`;

router.post("/agents/promo/interpret", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { message } = req.body ?? {};
  if (!message?.trim()) { res.status(400).json({ error: "message required" }); return; }

  try {
    const completion = await (await getOpenAI()).chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: PROMO_SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let plan: any;
    try {
      plan = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      plan = match ? JSON.parse(match[0]) : { summary: "Could not parse response", actions: [] };
    }
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "AI error" });
  }
});

router.post("/agents/promo/execute", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { actions } = req.body ?? {};
  if (!Array.isArray(actions) || actions.length === 0) {
    res.status(400).json({ error: "actions array required" });
    return;
  }

  const results: Array<{ type: string; id?: number; status: string }> = [];

  for (const action of actions) {
    try {
      if (action.type === "delivery_window") {
        const { name, dayOfWeek, specificDate, startTime, endTime } = action.data;
        const [row] = await db.insert(deliveryWindowsTable).values({
          name, dayOfWeek: dayOfWeek !== null && dayOfWeek !== undefined ? Number(dayOfWeek) : null,
          specificDate: specificDate || null, startTime, endTime, isActive: true,
        }).returning();
        results.push({ type: "delivery_window", id: row.id, status: "created" });

      } else if (action.type === "banner") {
        const { title, subtitle, bgColor, ctaText, ctaLink } = action.data;
        const [row] = await db.insert(bannersTable).values({
          title, subtitle: subtitle || null, bgColor: bgColor || "#0057B7",
          ctaText: ctaText || null, ctaLink: ctaLink || null, isActive: true, sortOrder: 0,
        }).returning();
        results.push({ type: "banner", id: row.id, status: "created" });

      } else if (action.type === "points_event") {
        const { name, multiplier, startsAt, endsAt } = action.data;
        const [row] = await db.insert(pointsEventsTable).values({
          name, multiplier: Number(multiplier ?? 2),
          startsAt: new Date(startsAt), endsAt: new Date(endsAt), isActive: true,
        }).returning();
        results.push({ type: "points_event", id: row.id, status: "created" });

      } else if (action.type === "push") {
        const { title, body, segment } = action.data;
        const allUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "customer"));
        results.push({ type: "push", status: "sent", id: allUsers.length });

      } else if (action.type === "qr_code") {
        const { targetPath, promoCode, description } = action.data;
        results.push({ type: "qr_code", status: "ready", targetPath, promoCode: promoCode ?? null, description } as any);

      } else {
        results.push({ type: action.type, status: "unknown_type" });
      }
    } catch (err: any) {
      results.push({ type: action.type, status: `error: ${err?.message}` });
    }
  }

  res.json({ ok: true, results });
});

// ─── 7. ACCOUNTANT AI AGENT ──────────────────────────────────────────────────

router.get("/agents/accountant/snapshot", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [allOrders, allBusinesses, allDrivers, allPayouts, allDeposits] = await Promise.all([
    db.select().from(ordersTable),
    db.select().from(businessesTable),
    db.select().from(driversTable),
    db.select().from(businessPayoutsTable),
    db.select().from(driverDepositsTable),
  ]);

  const delivered = allOrders.filter(o => o.status === "delivered");
  const deliveredToday = delivered.filter(o => new Date(o.createdAt) >= todayStart);
  const deliveredWeek  = delivered.filter(o => new Date(o.createdAt) >= weekAgo);
  const deliveredMonth = delivered.filter(o => new Date(o.createdAt) >= monthAgo);

  const sum = (arr: typeof delivered, field: "commission" | "totalAmount" | "deliveryFee") =>
    arr.reduce((s, o) => s + (o[field] ?? 0), 0);

  const revenueToday = sum(deliveredToday, "commission");
  const revenueWeek  = sum(deliveredWeek,  "commission");
  const revenueMonth = sum(deliveredMonth, "commission");
  const revenueTotal = sum(delivered, "commission");

  const gmvToday = sum(deliveredToday, "totalAmount") + sum(deliveredToday, "deliveryFee");
  const gmvWeek  = sum(deliveredWeek,  "totalAmount") + sum(deliveredWeek,  "deliveryFee");
  const gmvMonth = sum(deliveredMonth, "totalAmount") + sum(deliveredMonth, "deliveryFee");
  const gmvTotal = sum(delivered, "totalAmount") + sum(delivered, "deliveryFee");

  // Cash with drivers (delivered, not yet deposited at office)
  const cashWithDrivers = allOrders
    .filter(o => o.status === "delivered" && !(o as any).cashSettled)
    .reduce((s, o) => s + o.totalAmount + o.deliveryFee, 0);

  // Cash at office (deposited by driver, not yet paid to business)
  const cashAtOffice = allOrders
    .filter(o => o.status === "delivered" && (o as any).cashSettled && !(o as any).businessPaid)
    .reduce((s, o) => s + o.totalAmount + o.deliveryFee - o.commission, 0);

  // Pending business payouts
  const pendingPayouts = allPayouts
    .filter(p => (p as any).status === "pending")
    .reduce((s, p) => s + (p as any).amount, 0);

  // Locked driver balances (cash they haven't deposited yet from driversTable)
  const lockedCash = allDrivers.reduce((s, d) => s + (d.cashBalance ?? 0), 0);

  // Revenue by business (top 5 this month)
  const bizRevenue: Record<number, number> = {};
  for (const o of deliveredMonth) {
    bizRevenue[o.businessId] = (bizRevenue[o.businessId] ?? 0) + o.commission;
  }
  const topBusinesses = Object.entries(bizRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, commission]) => {
      const biz = allBusinesses.find(b => b.id === parseInt(id));
      return { businessId: parseInt(id), name: biz?.name ?? "Unknown", commission: Math.round(commission) };
    });

  // Recent deposits (last 10)
  const recentDeposits = [...allDeposits]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(d => ({
      id: d.id,
      driverId: d.driverId,
      amount: d.amountExpected,
      discrepancy: (d as any).discrepancy ?? 0,
      createdAt: d.createdAt,
    }));

  // Recent payouts (last 10)
  const recentPayouts = [...allPayouts]
    .sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime())
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      businessId: (p as any).businessId,
      amount: (p as any).amount,
      status: (p as any).status,
      method: (p as any).payoutMethod ?? null,
      createdAt: (p as any).createdAt,
    }));

  const totalDiscrepancies = allDeposits.reduce((s, d) => s + Math.abs((d as any).discrepancy ?? 0), 0);

  res.json({
    generatedAt: now.toISOString(),
    revenue: { today: Math.round(revenueToday), week: Math.round(revenueWeek), month: Math.round(revenueMonth), total: Math.round(revenueTotal) },
    gmv:     { today: Math.round(gmvToday),     week: Math.round(gmvWeek),     month: Math.round(gmvMonth),     total: Math.round(gmvTotal) },
    cashFlow: {
      cashWithDrivers: Math.round(cashWithDrivers),
      cashAtOffice:    Math.round(cashAtOffice),
      pendingPayouts:  Math.round(pendingPayouts),
      lockedDriverCash: Math.round(lockedCash),
      totalDiscrepancies: Math.round(totalDiscrepancies),
    },
    orders: {
      total: allOrders.length,
      delivered: delivered.length,
      today: deliveredToday.length,
      week: deliveredWeek.length,
      month: deliveredMonth.length,
    },
    topBusinesses,
    recentDeposits,
    recentPayouts,
  });
});

router.post("/agents/accountant/ask", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { question, snapshot, history } = req.body ?? {};
  if (!question?.trim()) { res.status(400).json({ error: "question required" }); return; }

  const snapshotText = snapshot ? JSON.stringify(snapshot, null, 2) : "No snapshot provided.";

  const systemPrompt = `Eres el Contador IA de YaPide, una app dominicana de delivery. Tu nombre es "ContadorBot".
Eres experto en las finanzas de YaPide y respondes en español dominicano, de manera profesional y precisa.

Datos financieros actuales (en RD$):
${snapshotText}

Glosario YaPide:
- Comisión (revenue): lo que YaPide se queda de cada pedido (~10-15% del totalAmount)
- GMV: valor bruto total de pedidos (totalAmount + deliveryFee)
- cashWithDrivers: efectivo en manos de choferes pendiente de depositar
- cashAtOffice: efectivo depositado por choferes, pendiente de pagar a negocios
- pendingPayouts: lo que YaPide debe pagarle a los negocios
- lockedDriverCash: balance en cuenta de choferes (no necesariamente efectivo físico)
- discrepancias: diferencia entre lo esperado y lo depositado

Responde de forma directa, precisa y en español. Si el admin pregunta en inglés, responde en inglés.
Cuando menciones montos, usa el formato "RD$X,XXX". Máximo 4 párrafos por respuesta.
Si no tienes datos suficientes para responder, dilo claramente y sugiere qué acción tomar.`;

  const chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (Array.isArray(history)) {
    for (const msg of history.slice(-8)) {
      if (msg.role === "user" || msg.role === "assistant") {
        chatHistory.push({ role: msg.role, content: String(msg.content) });
      }
    }
  }

  try {
    const completion = await (await getOpenAI()).chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim()
      ?? "No pude procesar tu pregunta. Por favor intenta de nuevo.";

    res.json({ answer });
  } catch (err: any) {
    console.error("Accountant AI error:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "AI error" });
  }
});

export default router;

