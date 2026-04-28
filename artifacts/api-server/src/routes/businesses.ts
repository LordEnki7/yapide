import { Router, type IRouter } from "express";
import { eq, ilike, and, gte, desc, or } from "drizzle-orm";
import { db, businessesTable, usersTable, ordersTable, orderItemsTable, businessPayoutsTable, productsTable } from "@workspace/db";
import { CreateBusinessBody, UpdateBusinessBody, ListBusinessesQueryParams, GetBusinessParams, UpdateBusinessParams } from "@workspace/api-zod";
import { requireAdminPermission } from "../lib/adminPermissions";

const router: IRouter = Router();

// ─── Business hours helpers ──────────────────────────────────────────────────
// DR is always UTC-4 (Atlantic Standard Time, no DST)
type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type DaySlot = { open: string; close: string } | null;
type OpenHours = Partial<Record<DayKey, DaySlot>>;

function getDRTime(): { dayKey: DayKey; minuteOfDay: number } {
  const now = new Date();
  const drMs = now.getTime() - 4 * 60 * 60 * 1000;
  const drDate = new Date(drMs);
  const days: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayKey = days[drDate.getUTCDay()];
  const minuteOfDay = drDate.getUTCHours() * 60 + drDate.getUTCMinutes();
  return { dayKey, minuteOfDay };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function computeIsOpenFromSchedule(openHoursJson: string | null | undefined, fallback: boolean): boolean {
  if (!openHoursJson) return fallback;
  try {
    const hours: OpenHours = JSON.parse(openHoursJson);
    const { dayKey, minuteOfDay } = getDRTime();
    const slot = hours[dayKey];
    if (!slot) return false;
    return minuteOfDay >= timeToMinutes(slot.open) && minuteOfDay < timeToMinutes(slot.close);
  } catch {
    return fallback;
  }
}

function formatBusiness(b: typeof businessesTable.$inferSelect) {
  const computedIsOpen = computeIsOpenFromSchedule(b.openHours, b.isOpen);
  return {
    id: b.id,
    userId: b.userId,
    name: b.name,
    category: b.category,
    description: b.description,
    address: b.address,
    city: b.city,
    phone: b.phone,
    imageUrl: b.imageUrl,
    logoUrl: b.logoUrl,
    lat: b.lat,
    lng: b.lng,
    isActive: b.isActive,
    isOpen: computedIsOpen,
    openHours: b.openHours ? JSON.parse(b.openHours) : null,
    approvalStatus: b.approvalStatus,
    rating: b.rating,
    totalOrders: b.totalOrders,
    prepTimeMinutes: b.prepTimeMinutes,
    createdAt: b.createdAt,
  };
}

// ─── Global search: businesses + products ────────────────────────────────────
router.get("/search", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q || q.length < 2) { res.json({ businesses: [], products: [] }); return; }
  const s = `%${q.toLowerCase()}%`;

  const allBusinesses = await db.select().from(businessesTable)
    .where(and(eq(businessesTable.isActive, true)));
  const matchedBusinesses = allBusinesses
    .filter(b => b.approvalStatus === "approved" && b.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 10)
    .map(formatBusiness);

  const allProducts = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    description: productsTable.description,
    price: productsTable.price,
    imageUrl: productsTable.imageUrl,
    category: productsTable.category,
    businessId: productsTable.businessId,
    businessName: businessesTable.name,
    businessLogoUrl: businessesTable.logoUrl,
  })
    .from(productsTable)
    .innerJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
    .where(and(
      eq(productsTable.isAvailable, true),
      eq(businessesTable.isActive, true),
    ));

  const matchedProducts = allProducts
    .filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.description ?? "").toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20);

  res.json({ businesses: matchedBusinesses, products: matchedProducts });
});

router.get("/businesses", async (req, res): Promise<void> => {
  const params = ListBusinessesQueryParams.safeParse(req.query);
  const businesses = await db.select().from(businessesTable).where(eq(businessesTable.isActive, true));
  let filtered = businesses.filter(b => b.approvalStatus === "approved");
  if (params.success && params.data.category && params.data.category !== "all") {
    filtered = filtered.filter(b => b.category === params.data.category);
  }
  if (params.success && params.data.search) {
    const s = params.data.search.toLowerCase();
    filtered = filtered.filter(b => b.name.toLowerCase().includes(s));
  }
  const city = typeof req.query.city === "string" ? req.query.city : null;
  if (city && city !== "all") {
    filtered = filtered.filter(b => b.city === city);
  }
  res.json(filtered.map(formatBusiness));
});

router.get("/businesses/mine", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.userId, sessionUserId));
  if (!business) { res.status(404).json({ error: "No business found" }); return; }
  res.json(formatBusiness(business));
});

router.get("/businesses/:businessId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid businessId" }); return; }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }
  res.json(formatBusiness(business));
});

router.post("/businesses", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [business] = await db.insert(businessesTable).values({
    userId: sessionUserId,
    ...parsed.data,
    approvalStatus: "pending",
  }).returning();
  res.status(201).json(formatBusiness(business));
});

router.patch("/businesses/mine/logo", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { logoUrl } = req.body;
  if (typeof logoUrl !== "string" || !logoUrl) { res.status(400).json({ error: "logoUrl required" }); return; }
  const [business] = await db.update(businessesTable).set({ logoUrl }).where(eq(businessesTable.userId, sessionUserId)).returning();
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }
  res.json(formatBusiness(business));
});

router.patch("/businesses/mine/prep-time", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { prepTimeMinutes } = req.body;
  if (typeof prepTimeMinutes !== "number" || prepTimeMinutes < 5 || prepTimeMinutes > 120) {
    res.status(400).json({ error: "prepTimeMinutes must be between 5 and 120" }); return;
  }
  const [business] = await db.update(businessesTable).set({ prepTimeMinutes }).where(eq(businessesTable.userId, sessionUserId)).returning();
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }
  res.json(formatBusiness(business));
});

// ─── Business hours schedule (per-day open/close time) ───────────────────────
router.patch("/businesses/mine/hours", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { openHours } = req.body;
  if (openHours === undefined) { res.status(400).json({ error: "openHours required" }); return; }

  // Validate structure: each day is null | { open: "HH:MM", close: "HH:MM" }
  const validDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const timeRe = /^\d{2}:\d{2}$/;
  if (openHours !== null) {
    for (const [day, slot] of Object.entries(openHours as Record<string, unknown>)) {
      if (!validDays.includes(day)) { res.status(400).json({ error: `Invalid day: ${day}` }); return; }
      if (slot === null) continue;
      if (typeof slot !== "object" || slot === null) { res.status(400).json({ error: `Invalid slot for ${day}` }); return; }
      const { open, close } = slot as any;
      if (!timeRe.test(open) || !timeRe.test(close)) { res.status(400).json({ error: `Invalid time for ${day}` }); return; }
    }
  }

  const openHoursJson = openHours === null ? null : JSON.stringify(openHours);
  const [business] = await db.update(businessesTable)
    .set({ openHours: openHoursJson })
    .where(eq(businessesTable.userId, sessionUserId))
    .returning();
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }
  res.json(formatBusiness(business));
});

router.patch("/businesses/:businessId", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid businessId" }); return; }
  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [business] = await db.update(businessesTable).set(parsed.data).where(eq(businessesTable.id, id)).returning();
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }
  res.json(formatBusiness(business));
});

// PATCH /api/businesses/:id/featured — admin toggle featured
router.patch("/businesses/:businessId/featured", requireAdminPermission("businesses"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.businessId as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isFeatured } = req.body ?? {};
  const [biz] = await db.update(businessesTable).set({ isFeatured: Boolean(isFeatured) }).where(eq(businessesTable.id, id)).returning();
  if (!biz) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: biz.id, isFeatured: biz.isFeatured });
});

router.get("/businesses/mine/analytics", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.userId, sessionUserId));
  if (!business) { res.status(404).json({ error: "No business found" }); return; }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const orders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.businessId, business.id), gte(ordersTable.createdAt, sevenDaysAgo)))
    .orderBy(desc(ordersTable.createdAt));

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const dayMap: Record<string, { revenue: number; orders: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = { revenue: 0, orders: 0 };
  }
  for (const o of orders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (dayMap[key]) {
      dayMap[key].revenue += o.totalAmount;
      dayMap[key].orders += 1;
    }
  }
  const dailyStats = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));

  const orderIds = orders.map(o => o.id);
  let topProducts: { productName: string; quantity: number; revenue: number }[] = [];
  if (orderIds.length > 0) {
    const items = await db.select().from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderIds[0]))
      .then(async () => {
        const all = await Promise.all(orderIds.map(id =>
          db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id))
        ));
        return all.flat();
      });
    const prodMap: Record<string, { quantity: number; revenue: number }> = {};
    for (const item of items) {
      if (!prodMap[item.productName]) prodMap[item.productName] = { quantity: 0, revenue: 0 };
      prodMap[item.productName].quantity += item.quantity;
      prodMap[item.productName].revenue += item.price * item.quantity;
    }
    topProducts = Object.entries(prodMap)
      .map(([productName, v]) => ({ productName, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  res.json({ totalRevenue, totalOrders, avgOrderValue, dailyStats, topProducts });
});

router.get("/businesses/mine/payouts", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.userId, sessionUserId));
  if (!business) { res.status(404).json({ error: "No business found" }); return; }

  const payouts = await db.select().from(businessPayoutsTable)
    .where(eq(businessPayoutsTable.businessId, business.id))
    .orderBy(desc(businessPayoutsTable.createdAt));

  // Three buckets using new columns
  const deliveredOrders = await db.select({
    totalAmount: ordersTable.totalAmount,
    commission: ordersTable.commission,
    paymentMethod: ordersTable.paymentMethod,
    cashSettled: ordersTable.cashSettled,
    businessPaid: ordersTable.businessPaid,
  }).from(ordersTable)
    .where(and(eq(ordersTable.businessId, business.id), eq(ordersTable.status, "delivered")));

  const inTransit = deliveredOrders
    .filter(o => o.paymentMethod === "cash" && !o.cashSettled)
    .reduce((s, o) => s + (o.totalAmount - o.commission), 0);

  const available = deliveredOrders
    .filter(o => o.cashSettled && !o.businessPaid)
    .reduce((s, o) => s + (o.totalAmount - o.commission), 0);

  const totalPaidOut = payouts.reduce((s, p) => s + p.amount, 0);

  res.json({
    inTransit: Math.max(0, inTransit),
    pendingAmount: Math.max(0, available),
    totalPaidOut,
    payouts: payouts.map(p => ({
      id: p.id, amount: p.amount, payoutMethod: p.payoutMethod, reference: p.reference, note: p.note, createdAt: p.createdAt,
    })),
  });
});

export default router;
