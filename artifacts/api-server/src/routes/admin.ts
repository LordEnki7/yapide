import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, usersTable, driversTable, businessesTable, ordersTable, productsTable, disputesTable, orderItemsTable, walletTransactionsTable } from "@workspace/db";
import { AdminListUsersQueryParams, AdminBanUserBody, AdminLockDriverBody } from "@workspace/api-zod";
import { sendWhatsApp } from "../lib/whatsapp";

const router: IRouter = Router();

function isAdmin(req: any): boolean {
  return !!(req.session as any)?.userId;
}

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = AdminListUsersQueryParams.safeParse(req.query);
  let users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  if (params.success && params.data.role) {
    users = users.filter(u => u.role === params.data.role);
  }
  res.json(users.map(u => ({
    id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, isBanned: u.isBanned, createdAt: u.createdAt,
  })));
});

router.post("/admin/users/:userId/ban", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid userId" }); return; }
  const parsed = AdminBanUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(usersTable).set({ isBanned: parsed.data.isBanned }).where(eq(usersTable.id, id));
  res.json({ success: true });
});

router.post("/admin/drivers/:driverId/approve", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid driverId" }); return; }
  const status = req.body.status ?? "approved";
  await db.update(driversTable).set({ approvalStatus: status }).where(eq(driversTable.id, id));
  res.json({ success: true, status });
});

router.post("/admin/drivers/:driverId/lock", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid driverId" }); return; }
  const parsed = AdminLockDriverBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(driversTable).set({ isLocked: parsed.data.isLocked, isOnline: parsed.data.isLocked ? false : undefined }).where(eq(driversTable.id, id));
  res.json({ success: true });
});

router.get("/admin/orders", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  res.json(orders.map(o => ({
    id: o.id, customerId: o.customerId, businessId: o.businessId, driverId: o.driverId, status: o.status,
    totalAmount: o.totalAmount, deliveryFee: o.deliveryFee, commission: o.commission, driverEarnings: o.driverEarnings,
    paymentMethod: o.paymentMethod, isPaid: o.isPaid, deliveryAddress: o.deliveryAddress, notes: o.notes,
    customerRating: o.customerRating, driverRating: o.driverRating, businessRating: o.businessRating, createdAt: o.createdAt, items: [],
  })));
});

router.get("/admin/businesses", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const businesses = await db.select().from(businessesTable).orderBy(desc(businessesTable.createdAt));
  res.json(businesses.map(b => ({
    id: b.id, userId: b.userId, name: b.name, category: b.category, description: b.description,
    address: b.address, city: b.city, phone: b.phone, imageUrl: b.imageUrl, lat: b.lat, lng: b.lng,
    isActive: b.isActive, approvalStatus: b.approvalStatus, rating: b.rating, totalOrders: b.totalOrders, createdAt: b.createdAt,
  })));
});

router.post("/admin/businesses/:businessId/approve", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid businessId" }); return; }
  const status = req.body.status ?? "approved";
  await db.update(businessesTable).set({ approvalStatus: status }).where(eq(businessesTable.id, id));
  res.json({ success: true, status });
});

router.get("/admin/drivers", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const drivers = await db.select().from(driversTable).orderBy(desc(driversTable.createdAt));
  const result = await Promise.all(drivers.map(async (d) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, d.userId));
    return {
      id: d.id, userId: d.userId, vehicleType: d.vehicleType, vehiclePlate: d.vehiclePlate,
      city: d.city, isOnline: d.isOnline, isLocked: d.isLocked, approvalStatus: d.approvalStatus,
      rating: d.rating, acceptanceRate: d.acceptanceRate,
      cashBalance: d.cashBalance, walletBalance: d.walletBalance, totalDeliveries: d.totalDeliveries,
      user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isBanned: user.isBanned, createdAt: user.createdAt } : null,
    };
  }));
  res.json(result);
});

router.post("/admin/businesses/:businessId/toggle", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid businessId" }); return; }
  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
  if (!biz) { res.status(404).json({ error: "Business not found" }); return; }
  await db.update(businessesTable).set({ isActive: !biz.isActive }).where(eq(businessesTable.id, id));
  res.json({ success: true });
});

router.post("/admin/businesses", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const sessionUserId = (req.session as any)?.userId;
  const { name, description, address, phone, category, imageUrl, lat, lng } = req.body;
  if (!name || !category || !address) { res.status(400).json({ error: "name, category, and address are required" }); return; }
  const [biz] = await db.insert(businessesTable).values({
    userId: sessionUserId,
    name, description: description || null, address, phone: phone || null,
    category, imageUrl: imageUrl || null,
    lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null,
    isActive: true,
  }).returning();
  res.status(201).json(biz);
});

router.patch("/admin/businesses/:businessId", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid businessId" }); return; }
  const { name, description, address, phone, category, imageUrl, lat, lng } = req.body;
  const [biz] = await db.update(businessesTable).set({
    ...(name && { name }), ...(description !== undefined && { description }),
    ...(address && { address }), ...(phone !== undefined && { phone }),
    ...(category && { category }), ...(imageUrl !== undefined && { imageUrl }),
    ...(lat !== undefined && { lat: lat ? parseFloat(lat) : null }),
    ...(lng !== undefined && { lng: lng ? parseFloat(lng) : null }),
  }).where(eq(businessesTable.id, id)).returning();
  if (!biz) { res.status(404).json({ error: "Business not found" }); return; }
  res.json(biz);
});

router.get("/admin/businesses/:businessId/products", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid businessId" }); return; }
  const products = await db.select().from(productsTable).where(eq(productsTable.businessId, id));
  res.json(products);
});

router.post("/admin/businesses/:businessId/products", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
  const bizId = parseInt(raw, 10);
  if (isNaN(bizId)) { res.status(400).json({ error: "Invalid businessId" }); return; }
  const { name, description, price, category, imageUrl, isAvailable } = req.body;
  if (!name || price === undefined) { res.status(400).json({ error: "name and price are required" }); return; }
  const [product] = await db.insert(productsTable).values({
    businessId: bizId, name, description: description || null,
    price: parseFloat(price), category: category || null,
    imageUrl: imageUrl || null, isAvailable: isAvailable !== false,
  }).returning();
  res.status(201).json(product);
});

router.patch("/admin/businesses/:businessId/products/:productId", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const productId = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid productId" }); return; }
  const { name, description, price, category, imageUrl, isAvailable } = req.body;
  const [product] = await db.update(productsTable).set({
    ...(name && { name }), ...(description !== undefined && { description }),
    ...(price !== undefined && { price: parseFloat(price) }),
    ...(category !== undefined && { category }),
    ...(imageUrl !== undefined && { imageUrl }),
    ...(isAvailable !== undefined && { isAvailable }),
  }).where(eq(productsTable.id, productId)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(product);
});

router.delete("/admin/businesses/:businessId/products/:productId", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const productId = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid productId" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, productId));
  res.json({ success: true });
});

router.get("/admin/disputes", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const disputes = await db.select().from(disputesTable).orderBy(desc(disputesTable.createdAt));
  const result = await Promise.all(disputes.map(async (d) => {
    const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, d.customerId));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, d.orderId));
    return {
      id: d.id, orderId: d.orderId, reason: d.reason, description: d.description,
      status: d.status, refundAmount: d.refundAmount, adminNotes: d.adminNotes,
      resolvedAt: d.resolvedAt, createdAt: d.createdAt,
      customer: customer ? { id: customer.id, name: customer.name, email: customer.email } : null,
      order: order ? { id: order.id, totalAmount: order.totalAmount, paymentMethod: order.paymentMethod } : null,
    };
  }));
  res.json(result);
});

router.patch("/admin/disputes/:disputeId/resolve", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const sessionUserId = (req.session as any)?.userId;
  const id = parseInt(Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid disputeId" }); return; }
  const { status, refundAmount, adminNotes } = req.body as { status: string; refundAmount?: number; adminNotes?: string };
  if (!status) { res.status(400).json({ error: "status is required" }); return; }
  const [dispute] = await db.update(disputesTable).set({
    status,
    refundAmount: refundAmount ?? null,
    adminNotes: adminNotes ?? null,
    resolvedById: sessionUserId,
    resolvedAt: new Date(),
  }).where(eq(disputesTable.id, id)).returning();
  if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }
  res.json(dispute);
});

router.post("/admin/drivers/:driverId/request-dropoff", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid driverId" }); return; }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, driver.userId));
  if (!user?.phone) { res.status(400).json({ error: "Driver has no phone number on file" }); return; }

  const name = user.name?.split(" ")[0] ?? "Driver";
  const amountStr = `RD$${Math.round(driver.cashBalance).toLocaleString()}`;
  const message = `💰 Hola ${name}, el equipo de *YaPide* te solicita que pases a la oficina a entregar el efectivo que tienes (${amountStr}). Por favor llega lo antes posible con todo el efectivo. ¡Gracias! 📍 Oficina YaPide`;

  const sent = await sendWhatsApp(user.phone, message);
  res.json({ success: true, messageSent: sent, driverName: user.name, cashBalance: driver.cashBalance });
});

router.post("/admin/drivers/:driverId/record-dropoff", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid driverId" }); return; }

  const amount = parseFloat(req.body.amount);
  if (isNaN(amount) || amount <= 0) { res.status(400).json({ error: "amount must be a positive number" }); return; }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  const newCashBalance = Math.max(0, driver.cashBalance - amount);
  const shouldUnlock = driver.isLocked && newCashBalance <= 0;

  await db.update(driversTable).set({
    cashBalance: newCashBalance,
    ...(shouldUnlock && { isLocked: false }),
  }).where(eq(driversTable.id, id));

  await db.insert(walletTransactionsTable).values({
    driverId: id,
    type: "cash_dropoff",
    amount: -amount,
    description: `Entrega de efectivo en oficina — RD$${Math.round(amount).toLocaleString()}`,
  });

  res.json({ success: true, previousBalance: driver.cashBalance, newCashBalance, unlockedDriver: shouldUnlock });
});

router.post("/admin/orders/:orderId/assign-driver", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid orderId" }); return; }
  const { driverId } = req.body as { driverId: number };
  if (!driverId) { res.status(400).json({ error: "driverId is required" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
  const [updated] = await db.update(ordersTable).set({ driverId }).where(eq(ordersTable.id, orderId)).returning();
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  res.json({ ...updated, items });
});

export default router;
