import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, businessesTable, usersTable } from "@workspace/db";
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
    phone: b.phone,
    imageUrl: b.imageUrl,
    lat: b.lat,
    lng: b.lng,
    isActive: b.isActive,
    isOpen: b.isOpen,
    rating: b.rating,
    totalOrders: b.totalOrders,
    createdAt: b.createdAt,
  };
}

router.get("/businesses", async (req, res): Promise<void> => {
  const params = ListBusinessesQueryParams.safeParse(req.query);
  let query = db.select().from(businessesTable).where(eq(businessesTable.isActive, true));
  const businesses = await db.select().from(businessesTable).where(eq(businessesTable.isActive, true));
  let filtered = businesses;
  if (params.success && params.data.category && params.data.category !== "all") {
    filtered = filtered.filter(b => b.category === params.data.category);
  }
  if (params.success && params.data.search) {
    const s = params.data.search.toLowerCase();
    filtered = filtered.filter(b => b.name.toLowerCase().includes(s));
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
  }).returning();
  res.status(201).json(formatBusiness(business));
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

export default router;
