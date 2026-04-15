import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  usersTable,
  businessesTable,
  productsTable,
  driversTable,
  ordersTable,
  orderItemsTable,
  walletTransactionsTable,
  pointsTransactionsTable,
} from "@workspace/db";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

const DEMO_USERS = [
  { name: "Juan Pérez", email: "demo@customer.yapida.app", role: "customer", phone: "809-555-0001" },
  { name: "Miguel Santos", email: "demo@driver.yapida.app", role: "driver", phone: "809-555-0002" },
  { name: "Ana Gómez", email: "demo@business.yapida.app", role: "business", phone: "809-555-0003" },
  { name: "Admin Demo", email: "demo@admin.yapida.app", role: "admin", phone: "809-555-0004" },
];

const DEMO_PASSWORD = hashPassword("demo123");

router.post("/demo/seed", async (_req, res): Promise<void> => {
  try {
    // Upsert demo users
    const createdUsers: Record<string, typeof usersTable.$inferSelect> = {};
    for (const u of DEMO_USERS) {
      const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, u.email));
      if (existing) {
        createdUsers[u.role] = existing;
      } else {
        const [created] = await db.insert(usersTable).values({
          name: u.name,
          email: u.email,
          phone: u.phone,
          passwordHash: DEMO_PASSWORD,
          role: u.role,
          points: u.role === "customer" ? 340 : 0,
        }).returning();
        createdUsers[u.role] = created;
      }
    }

    const customerUser = createdUsers["customer"];
    const driverUser = createdUsers["driver"];
    const businessUser = createdUsers["business"];

    // Upsert demo driver record
    let driverRecord: typeof driversTable.$inferSelect | null = null;
    const [existingDriver] = await db.select().from(driversTable).where(eq(driversTable.userId, driverUser.id));
    if (existingDriver) {
      driverRecord = existingDriver;
    } else {
      const [created] = await db.insert(driversTable).values({
        userId: driverUser.id,
        vehicleType: "moto",
        vehiclePlate: "A-12345",
        isOnline: false,
        rating: 4.8,
        acceptanceRate: 0.95,
        cashBalance: 2400,
        walletBalance: 8750,
        totalDeliveries: 143,
      }).returning();
      driverRecord = created;

      // Wallet transactions for driver
      await db.insert(walletTransactionsTable).values([
        { driverId: driverRecord.id, type: "earning", amount: 350, description: "Delivery #1091 - Pollos El Campeón" },
        { driverId: driverRecord.id, type: "earning", amount: 280, description: "Delivery #1090 - Colmado Don Cheo" },
        { driverId: driverRecord.id, type: "earning", amount: 420, description: "Delivery #1089 - Pizza La Zona" },
        { driverId: driverRecord.id, type: "earning", amount: 310, description: "Delivery #1088 - Farmacia San Judas" },
        { driverId: driverRecord.id, type: "bonus", amount: 500, description: "Bono semanal - 10 entregas seguidas" },
        { driverId: driverRecord.id, type: "withdrawal", amount: -2000, description: "Retiro billetera" },
      ]);
    }

    // Demo businesses
    const businessDefs = [
      {
        name: "Pollos El Campeón",
        category: "food",
        address: "Av. 27 de Febrero #45, Santiago",
        phone: "809-971-2233",
        imageUrl: "https://images.unsplash.com/photo-1598514983318-2f64f8f4796c?w=800&q=80",
        rating: 4.9,
        isOpen: true,
        prepTimeMinutes: 20,
        products: [
          { name: "Pollo a la Brasa entero", description: "Pollo asado a la leña con yuca y ensalada", price: 850, category: "Especiales" },
          { name: "Medio pollo", description: "Con arroz, habichuelas y tostones", price: 450, category: "Platos" },
          { name: "Cuarto de pollo", description: "Muslo o pechuga con acompañante", price: 280, category: "Platos" },
          { name: "Tostones", description: "Tostones crujientes con ajo", price: 120, category: "Acompañantes" },
          { name: "Yuca hervida", description: "Yuca con mojo de ajo", price: 100, category: "Acompañantes" },
          { name: "Chimichurri", description: "Burger dominicana con papas", price: 250, category: "Extras" },
          { name: "Refresco 2L", description: "Coca-Cola, Fanta o Sprite", price: 130, category: "Bebidas" },
        ],
      },
      {
        name: "Colmado Don Cheo",
        category: "supermarket",
        address: "Calle Real #12, Villa González",
        phone: "809-580-4455",
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
        rating: 4.7,
        isOpen: true,
        prepTimeMinutes: 10,
        products: [
          { name: "Salami Induveca 225g", description: "El clásico del desayuno dominicano", price: 185, category: "Embutidos" },
          { name: "Pan de agua x6", description: "Pan fresco del día", price: 80, category: "Panadería" },
          { name: "Huevos x12", description: "Huevos frescos de granja", price: 220, category: "Frescos" },
          { name: "Arroz Selecto 5lb", description: "Arroz blanco de grano largo", price: 290, category: "Granos" },
          { name: "Habichuelas Rojas 1lb", description: "Habichuelas secas seleccionadas", price: 110, category: "Granos" },
          { name: "Aceite Vegetal 1L", description: "Aceite vegetal puro", price: 210, category: "Aceites" },
          { name: "Leche Evaporada", description: "Leche evaporada entera 410ml", price: 145, category: "Lácteos" },
          { name: "Café Santo Domingo 6oz", description: "Café tostado y molido", price: 175, category: "Bebidas" },
        ],
      },
      {
        name: "Farmacia San Judas",
        category: "pharmacy",
        address: "Calle Benito Monción #88, Santiago",
        phone: "809-583-7766",
        imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
        rating: 4.6,
        isOpen: true,
        prepTimeMinutes: 8,
        products: [
          { name: "Paracetamol 500mg x20", description: "Analgésico y antipirético", price: 95, category: "Analgésicos" },
          { name: "Ibuprofeno 400mg x10", description: "Antiinflamatorio y analgésico", price: 120, category: "Analgésicos" },
          { name: "Vitamina C 1000mg x30", description: "Suplemento vitamínico", price: 285, category: "Vitaminas" },
          { name: "Alcohol 70% 500ml", description: "Alcohol isopropílico antiséptico", price: 145, category: "Antisépticos" },
          { name: "Mascarillas x10", description: "Mascarillas desechables", price: 180, category: "Protección" },
          { name: "Omeprazol 20mg x14", description: "Para la acidez y gastritis", price: 165, category: "Gástrico" },
        ],
      },
      {
        name: "Pizza La Zona",
        category: "food",
        address: "Av. Las Carreras #200, Santiago",
        phone: "809-724-9988",
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
        rating: 4.5,
        isOpen: true,
        prepTimeMinutes: 30,
        products: [
          { name: "Pizza Pepperoni Grande", description: "Pizza 14\" con extra pepperoni", price: 750, category: "Pizzas" },
          { name: "Pizza Hawaiana Grande", description: "Jamón, piña y queso mozzarella", price: 720, category: "Pizzas" },
          { name: "Pizza Especial La Zona", description: "Salami, pollo, pimientos y champiñones", price: 850, category: "Pizzas" },
          { name: "Pizza Personal", description: "Pizza individual 8\" a tu elección", price: 350, category: "Pizzas" },
          { name: "Alitas BBQ x10", description: "Alitas de pollo con salsa BBQ", price: 480, category: "Extras" },
          { name: "Coca-Cola 2L", description: "Bebida fría incluye hielo", price: 130, category: "Bebidas" },
          { name: "Palitos de Ajo", description: "Pan de ajo con queso parmesano", price: 220, category: "Extras" },
        ],
      },
      {
        name: "Panadería La Española",
        category: "food",
        address: "Calle del Sol #33, Centro, Santiago",
        phone: "809-241-3344",
        imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
        rating: 4.8,
        isOpen: true,
        prepTimeMinutes: 15,
        products: [
          { name: "Tres Leches personal", description: "Pastel tres leches con chantilly", price: 180, category: "Pasteles" },
          { name: "Bizcocho de Cumpleaños 1lb", description: "Bizcocho dominicano decorado", price: 650, category: "Bizcochos" },
          { name: "Empanadas x6", description: "Empanadas de carne molida o pollo", price: 240, category: "Savory" },
          { name: "Croissant de jamón y queso", description: "Croissant relleno recién horneado", price: 145, category: "Savory" },
          { name: "Pan Sobao 1lb", description: "Pan sobao dulce recién horneado", price: 120, category: "Panes" },
          { name: "Café con leche", description: "Café dominicano caliente", price: 85, category: "Bebidas" },
        ],
      },
      {
        name: "Lavandería El Brillo",
        category: "laundry",
        address: "Calle Beller #18, Santiago",
        phone: "809-971-4488",
        imageUrl: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&q=80",
        rating: 4.9,
        isOpen: true,
        prepTimeMinutes: 120,
        products: [
          { name: "Bolsa Pequeña (~3 lb)", description: "Ideal para ropa de 2–3 días. Lavado, secado y doblado incluido.", price: 420, category: "Por Bolsa" },
          { name: "Bolsa Mediana (~6 lb)", description: "Perfecta para una semana de ropa casual.", price: 780, category: "Por Bolsa" },
          { name: "Bolsa Grande (~10+ lb)", description: "Colchas, cobijas, uniformes o ropa de toda la semana.", price: 1150, category: "Por Bolsa" },
          { name: "Lavado Normal /lb", description: "Ropa casual — lavado, secado y doblado. Precio por libra.", price: 65, category: "Por Libra" },
          { name: "Lavado Delicado /lb", description: "Ropa fina, ciclo suave y temperatura controlada.", price: 85, category: "Por Libra" },
          { name: "Lavado en Seco /lb", description: "Limpieza en seco profesional, entrega en funda.", price: 145, category: "Por Libra" },
          { name: "Planchado /lb", description: "Planchado a vapor profesional para una presentación impecable.", price: 55, category: "Por Libra" },
        ],
      },
    ];

    const createdBusinesses: typeof businessesTable.$inferSelect[] = [];
    for (const biz of businessDefs) {
      const [existing] = await db.select().from(businessesTable)
        .where(and(eq(businessesTable.userId, businessUser.id), eq(businessesTable.name, biz.name)));

      let bizRecord: typeof businessesTable.$inferSelect;
      if (existing) {
        bizRecord = existing;
        // For laundry: refresh products if they're the old format (no "Por Bolsa" category)
        if (biz.category === "laundry") {
          const existingProds = await db.select().from(productsTable).where(eq(productsTable.businessId, bizRecord.id));
          const hasNewFormat = existingProds.some(p => p.category === "Por Bolsa");
          if (!hasNewFormat) {
            await db.delete(productsTable).where(eq(productsTable.businessId, bizRecord.id));
            for (const p of biz.products) {
              await db.insert(productsTable).values({ businessId: bizRecord.id, ...p, isAvailable: true });
            }
          }
        }
      } else {
        const { products: _p, ...bizData } = biz;
        const [created] = await db.insert(businessesTable).values({
          ...bizData,
          userId: businessUser.id,
          isActive: true,
          totalOrders: Math.floor(Math.random() * 500) + 50,
        }).returning();
        bizRecord = created;

        // Seed products
        for (const p of biz.products) {
          await db.insert(productsTable).values({
            businessId: bizRecord.id,
            ...p,
            isAvailable: true,
          });
        }
      }
      createdBusinesses.push(bizRecord);
    }

    const [pollosBiz, colmadoBiz, farmaciaBiz, pizzaBiz, panaderaBiz, _laundryBiz] = createdBusinesses;

    // Seed orders only if none exist for demo customer
    const existingOrders = await db.select().from(ordersTable).where(eq(ordersTable.customerId, customerUser.id));
    if (existingOrders.length === 0 && driverRecord) {
      const orderDefs = [
        {
          businessId: pollosBiz.id,
          driverId: driverRecord.id,
          status: "delivered",
          totalAmount: 1730,
          deliveryFee: 150,
          commission: 173,
          driverEarnings: 350,
          paymentMethod: "cash",
          deliveryAddress: "Calle Restauración #14, Los Jardines, Santiago",
          items: [
            { productName: "Pollo a la Brasa entero", quantity: 1, price: 850 },
            { productName: "Tostones", quantity: 2, price: 120 },
            { productName: "Yuca hervida", quantity: 1, price: 100 },
            { productName: "Refresco 2L", quantity: 2, price: 130 },
          ],
        },
        {
          businessId: pizzaBiz.id,
          driverId: driverRecord.id,
          status: "delivered",
          totalAmount: 1610,
          deliveryFee: 120,
          commission: 161,
          driverEarnings: 280,
          paymentMethod: "card",
          deliveryAddress: "Av. Estrella Sadhalá #78, Santiago",
          items: [
            { productName: "Pizza Especial La Zona", quantity: 1, price: 850 },
            { productName: "Alitas BBQ x10", quantity: 1, price: 480 },
            { productName: "Coca-Cola 2L", quantity: 2, price: 130 },
          ],
        },
        {
          businessId: colmadoBiz.id,
          driverId: driverRecord.id,
          status: "delivered",
          totalAmount: 880,
          deliveryFee: 80,
          commission: 88,
          driverEarnings: 200,
          paymentMethod: "cash",
          deliveryAddress: "Calle del Maestro #5, Santiago",
          items: [
            { productName: "Arroz Selecto 5lb", quantity: 2, price: 290 },
            { productName: "Habichuelas Rojas 1lb", quantity: 1, price: 110 },
          ],
        },
        {
          businessId: panaderaBiz.id,
          driverId: driverRecord.id,
          status: "preparing",
          totalAmount: 685,
          deliveryFee: 100,
          commission: 68,
          driverEarnings: 200,
          paymentMethod: "cash",
          deliveryAddress: "Calle Duarte #212, Villa Olga, Santiago",
          items: [
            { productName: "Bizcocho de Cumpleaños 1lb", quantity: 1, price: 650 },
            { productName: "Café con leche", quantity: 2, price: 85 },
          ],
        },
        {
          businessId: farmaciaBiz.id,
          driverId: null,
          status: "pending",
          totalAmount: 500,
          deliveryFee: 80,
          commission: 50,
          driverEarnings: 150,
          paymentMethod: "cash",
          deliveryAddress: "Calle Las Flores #7, Los Álamos, Santiago",
          items: [
            { productName: "Paracetamol 500mg x20", quantity: 2, price: 95 },
            { productName: "Vitamina C 1000mg x30", quantity: 1, price: 285 },
          ],
        },
      ];

      for (const o of orderDefs) {
        const { items, ...orderData } = o;
        const [order] = await db.insert(ordersTable).values({
          ...orderData,
          customerId: customerUser.id,
          tip: 0,
          isPaid: o.status === "delivered",
          promoDiscount: 0,
          customerRating: o.status === "delivered" ? 5 : null,
        }).returning();

        for (const item of items) {
          await db.insert(orderItemsTable).values({
            orderId: order.id,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          });
        }
      }

      // Points transactions for customer
      await db.insert(pointsTransactionsTable).values([
        { userId: customerUser.id, type: "earned", amount: 200, description: "Pedido en Pollos El Campeón" },
        { userId: customerUser.id, type: "earned", amount: 150, description: "Pedido en Pizza La Zona" },
        { userId: customerUser.id, type: "earned", amount: 100, description: "Pedido en Colmado Don Cheo" },
        { userId: customerUser.id, type: "bonus", amount: 100, description: "Bono bienvenida YaPide" },
        { userId: customerUser.id, type: "redeemed", amount: -210, description: "Descuento aplicado en pedido" },
      ]);

      // Update customer points
      await db.update(usersTable).set({ points: 340 }).where(eq(usersTable.id, customerUser.id));
    }

    res.json({ success: true, message: "Demo data seeded successfully" });
  } catch (err: any) {
    console.error("Demo seed error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/demo/login", async (req, res): Promise<void> => {
  const role = req.query["role"] as string;
  const validRoles = ["customer", "driver", "business", "admin"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role. Use: customer, driver, business, or admin" });
    return;
  }

  const email = `demo@${role}.yapida.app`;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.status(404).json({ error: "Demo data not seeded yet. Call POST /api/demo/seed first." });
    return;
  }

  (req.session as any).userId = user.id;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isBanned: user.isBanned,
    },
    token: `session-${user.id}`,
  });
});

export default router;
