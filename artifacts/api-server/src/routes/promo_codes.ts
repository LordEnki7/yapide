import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, promoCodesTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/promo-codes/validate", async (req, res): Promise<void> => {
  const { code, orderTotal } = req.body as { code?: string; orderTotal?: number };
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing code" });
    return;
  }

  const [promo] = await db.select().from(promoCodesTable).where(
    and(eq(promoCodesTable.code, code.toUpperCase()), eq(promoCodesTable.isActive, true))
  );

  if (!promo) {
    res.status(404).json({ error: "Código no válido" });
    return;
  }
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    res.status(400).json({ error: "Código expirado" });
    return;
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    res.status(400).json({ error: "Código ya agotado" });
    return;
  }
  const total = typeof orderTotal === "number" ? orderTotal : 0;
  if (total < promo.minOrder) {
    res.status(400).json({ error: `Mínimo RD$${promo.minOrder} para usar este código` });
    return;
  }

  const discountAmount = promo.discountType === "percent"
    ? Math.floor(total * (promo.discountValue / 100))
    : promo.discountValue;

  res.json({
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount,
  });
});

router.post("/promo-codes", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { code, discountType, discountValue, minOrder, maxUses, expiresAt } = req.body;
  if (!code || !discountType || !discountValue) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [promo] = await db.insert(promoCodesTable).values({
    code: String(code).toUpperCase(),
    discountType,
    discountValue: Number(discountValue),
    minOrder: Number(minOrder ?? 0),
    maxUses: maxUses ? Number(maxUses) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  res.status(201).json(promo);
});

router.get("/promo-codes", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const promos = await db.select().from(promoCodesTable).orderBy(promoCodesTable.createdAt);
  res.json(promos);
});

router.patch("/promo-codes/:id", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== "boolean") { res.status(400).json({ error: "Missing isActive" }); return; }
  const [updated] = await db.update(promoCodesTable).set({ isActive }).where(eq(promoCodesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/promo-codes/:id", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as any)?.userId;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(promoCodesTable).where(eq(promoCodesTable.id, id));
  res.json({ ok: true });
});

export default router;
