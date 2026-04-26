import { Router, type IRouter } from "express";
import { eq, and, lte, gte, asc } from "drizzle-orm";
import { db, pointsEventsTable } from "@workspace/db";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  next();
}

// Utility: get active multiplier for right now (returns 1 if none)
export async function getActivePointsMultiplier(): Promise<number> {
  const now = new Date();
  const events = await db.select().from(pointsEventsTable)
    .where(and(
      eq(pointsEventsTable.isActive, true),
      lte(pointsEventsTable.startsAt, now),
      gte(pointsEventsTable.endsAt, now),
    ));
  if (!events.length) return 1;
  return Math.max(...events.map(e => e.multiplier ?? 1));
}

// GET /api/points-events
router.get("/points-events", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await db.select().from(pointsEventsTable).orderBy(asc(pointsEventsTable.startsAt)));
});

// GET /api/points-events/active — public
router.get("/points-events/active", async (_req, res): Promise<void> => {
  const now = new Date();
  const events = await db.select().from(pointsEventsTable)
    .where(and(eq(pointsEventsTable.isActive, true), lte(pointsEventsTable.startsAt, now), gte(pointsEventsTable.endsAt, now)));
  res.json(events);
});

// POST /api/points-events
router.post("/points-events", requireAdmin, async (req, res): Promise<void> => {
  const { name, multiplier, startsAt, endsAt, isActive } = req.body ?? {};
  if (!name || !startsAt || !endsAt) { res.status(400).json({ error: "name, startsAt, endsAt required" }); return; }
  const [row] = await db.insert(pointsEventsTable).values({
    name, multiplier: Number(multiplier ?? 2),
    startsAt: new Date(startsAt), endsAt: new Date(endsAt), isActive: isActive !== false,
  }).returning();
  res.status(201).json(row);
});

// PATCH /api/points-events/:id
router.patch("/points-events/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const updates: any = {};
  ["name","multiplier","startsAt","endsAt","isActive"].forEach(f => { if (f in req.body) updates[f] = req.body[f]; });
  if (updates.startsAt) updates.startsAt = new Date(updates.startsAt);
  if (updates.endsAt) updates.endsAt = new Date(updates.endsAt);
  const [row] = await db.update(pointsEventsTable).set(updates).where(eq(pointsEventsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// DELETE /api/points-events/:id
router.delete("/points-events/:id", requireAdmin, async (req, res): Promise<void> => {
  await db.delete(pointsEventsTable).where(eq(pointsEventsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
