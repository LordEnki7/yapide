import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, favoritesTable, businessesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/favorites", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const favs = await db.select().from(favoritesTable).where(eq(favoritesTable.customerId, sessionUserId));
  const businessIds = favs.map(f => f.businessId);
  if (!businessIds.length) { res.json([]); return; }
  const businesses = await Promise.all(
    businessIds.map(id => db.select().from(businessesTable).where(eq(businessesTable.id, id)).then(r => r[0]))
  );
  res.json(businesses.filter(Boolean).map(b => ({
    id: b!.id, name: b!.name, category: b!.category, imageUrl: b!.imageUrl,
    city: b!.city, rating: b!.rating, isOpen: b!.isOpen,
  })));
});

router.post("/favorites/:businessId", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const businessId = parseInt(Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId, 10);
  if (isNaN(businessId)) { res.status(400).json({ error: "Invalid businessId" }); return; }
  const existing = await db.select().from(favoritesTable).where(
    and(eq(favoritesTable.customerId, sessionUserId), eq(favoritesTable.businessId, businessId))
  );
  if (existing.length) { res.json({ success: true, favorited: true }); return; }
  await db.insert(favoritesTable).values({ customerId: sessionUserId, businessId });
  res.json({ success: true, favorited: true });
});

router.delete("/favorites/:businessId", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const businessId = parseInt(Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId, 10);
  if (isNaN(businessId)) { res.status(400).json({ error: "Invalid businessId" }); return; }
  await db.delete(favoritesTable).where(
    and(eq(favoritesTable.customerId, sessionUserId), eq(favoritesTable.businessId, businessId))
  );
  res.json({ success: true, favorited: false });
});

export default router;
