import { Router, type IRouter } from "express";
import { eq, and, or, isNull, lte, gte, asc } from "drizzle-orm";
import { db, bannersTable } from "@workspace/db";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  next();
}

// GET /api/banners/active — public, returns banners active right now
router.get("/banners/active", async (_req, res): Promise<void> => {
  const now = new Date();
  const rows = await db.select().from(bannersTable)
    .where(and(
      eq(bannersTable.isActive, true),
      or(isNull(bannersTable.startsAt), lte(bannersTable.startsAt, now)),
      or(isNull(bannersTable.endsAt), gte(bannersTable.endsAt, now)),
    ))
    .orderBy(asc(bannersTable.sortOrder));
  res.json(rows);
});

// GET /api/banners — admin only
router.get("/banners", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(bannersTable).orderBy(asc(bannersTable.sortOrder));
  res.json(rows);
});

// POST /api/banners — create
router.post("/banners", requireAdmin, async (req, res): Promise<void> => {
  const { title, subtitle, imageUrl, bgColor, ctaText, ctaLink, isActive, sortOrder, startsAt, endsAt } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [row] = await db.insert(bannersTable).values({
    title, subtitle: subtitle || null, imageUrl: imageUrl || null,
    bgColor: bgColor || "#0057B7", ctaText: ctaText || null, ctaLink: ctaLink || null,
    isActive: isActive !== false, sortOrder: Number(sortOrder ?? 0),
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
  }).returning();
  res.status(201).json(row);
});

// PATCH /api/banners/:id
router.patch("/banners/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const updates: any = {};
  const fields = ["title","subtitle","imageUrl","bgColor","ctaText","ctaLink","isActive","sortOrder","startsAt","endsAt"];
  fields.forEach(f => { if (f in req.body) updates[f] = req.body[f]; });
  if (updates.startsAt) updates.startsAt = new Date(updates.startsAt);
  if (updates.endsAt) updates.endsAt = new Date(updates.endsAt);
  const [row] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// DELETE /api/banners/:id
router.delete("/banners/:id", requireAdmin, async (req, res): Promise<void> => {
  await db.delete(bannersTable).where(eq(bannersTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
