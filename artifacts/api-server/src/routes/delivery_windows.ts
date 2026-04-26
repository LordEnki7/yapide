import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, deliveryWindowsTable } from "@workspace/db";
import { requireAdminPermission } from "../lib/adminPermissions";

const router: IRouter = Router();
const requireAdmin = requireAdminPermission("promo_codes");

// Utility: is right now inside any active free delivery window?
export async function isFreeDeliveryActive(): Promise<boolean> {
  const windows = await db.select().from(deliveryWindowsTable).where(eq(deliveryWindowsTable.isActive, true));
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayStr = now.toISOString().slice(0, 10);
  for (const w of windows) {
    const dayMatch = w.dayOfWeek === null || w.dayOfWeek === dayOfWeek;
    const dateMatch = !w.specificDate || w.specificDate === todayStr;
    if (dayMatch && dateMatch && hhmm >= w.startTime && hhmm <= w.endTime) return true;
  }
  return false;
}

// GET /api/delivery-windows — all (admin)
router.get("/delivery-windows", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await db.select().from(deliveryWindowsTable).orderBy(asc(deliveryWindowsTable.id)));
});

// GET /api/delivery-windows/active — public check
router.get("/delivery-windows/active", async (_req, res): Promise<void> => {
  res.json({ active: await isFreeDeliveryActive() });
});

// POST /api/delivery-windows
router.post("/delivery-windows", requireAdmin, async (req, res): Promise<void> => {
  const { name, dayOfWeek, specificDate, startTime, endTime, isActive } = req.body ?? {};
  if (!name || !startTime || !endTime) { res.status(400).json({ error: "name, startTime, endTime required" }); return; }
  const [row] = await db.insert(deliveryWindowsTable).values({
    name, dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? Number(dayOfWeek) : null,
    specificDate: specificDate || null, startTime, endTime, isActive: isActive !== false,
  }).returning();
  res.status(201).json(row);
});

// PATCH /api/delivery-windows/:id
router.patch("/delivery-windows/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const updates: any = {};
  ["name","dayOfWeek","specificDate","startTime","endTime","isActive"].forEach(f => { if (f in req.body) updates[f] = req.body[f]; });
  const [row] = await db.update(deliveryWindowsTable).set(updates).where(eq(deliveryWindowsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// DELETE /api/delivery-windows/:id
router.delete("/delivery-windows/:id", requireAdmin, async (req, res): Promise<void> => {
  await db.delete(deliveryWindowsTable).where(eq(deliveryWindowsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
