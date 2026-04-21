import { Router, type IRouter } from "express";
import { eq, ilike, and, gte, desc } from "drizzle-orm";
import { db, businessesTable, usersTable, ordersTable, orderItemsTable } from "@workspace/db";
import { CreateBusinessBody, UpdateBusinessBody, ListBusinessesQueryParams, GetBusinessParams, UpdateBusinessParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatBusiness(b: typeof businessesTable.$inferSelect) {
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
    lat: b.lat,
    lng: b.lng,
    isActive: b.isActive,
    isOpen: b.isOpen,
    approvalStatus: b.approvalStatus,
    rating: b.rating,
    totalOrders: b.totalOrders,
    prepTimeMinutes: b.prepTimeMinutes,
    createdAt: b.createdAt,
  };
}

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

export default router;
