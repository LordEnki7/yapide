import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { businessesTable } from "./businesses";
import { driversTable } from "./drivers";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => usersTable.id),
  businessId: integer("business_id").notNull().references(() => businessesTable.id),
  driverId: integer("driver_id").references(() => driversTable.id),
  status: text("status").notNull().default("pending"),
  totalAmount: real("total_amount").notNull(),
  deliveryFee: real("delivery_fee").notNull(),
  commission: real("commission").notNull(),
  driverEarnings: real("driver_earnings").notNull(),
  tip: real("tip").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("cash"),
  isPaid: boolean("is_paid").notNull().default(false),
  deliveryAddress: text("delivery_address").notNull(),
  notes: text("notes"),
  customerRating: integer("customer_rating"),
  driverRating: integer("driver_rating"),
  businessRating: integer("business_rating"),
  deliveryPhotoPath: text("delivery_photo_path"),
  verificationPin: text("verification_pin"),
  promoCode: text("promo_code"),
  promoDiscount: real("promo_discount").notNull().default(0),
  orderType: text("order_type").notNull().default("delivery"),
  pickupAddress: text("pickup_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: real("price").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
