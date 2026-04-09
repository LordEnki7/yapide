import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, userAddressesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/customer/addresses", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  const addresses = await db
    .select()
    .from(userAddressesTable)
    .where(eq(userAddressesTable.userId, req.session.userId))
    .orderBy(desc(userAddressesTable.isDefault), desc(userAddressesTable.createdAt));
  return res.json(addresses);
});

router.post("/customer/addresses", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  const { label, address, isDefault } = req.body;
  if (!label || !address) return res.status(400).json({ error: "label and address are required" });

  if (isDefault) {
    await db
      .update(userAddressesTable)
      .set({ isDefault: false })
      .where(eq(userAddressesTable.userId, req.session.userId));
  }

  const [saved] = await db.insert(userAddressesTable).values({
    userId: req.session.userId,
    label,
    address,
    isDefault: isDefault ?? false,
  }).returning();

  return res.status(201).json(saved);
});

router.delete("/customer/addresses/:id", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db
    .delete(userAddressesTable)
    .where(and(eq(userAddressesTable.id, id), eq(userAddressesTable.userId, req.session.userId)));

  return res.json({ success: true });
});

export default router;
