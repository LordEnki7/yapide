import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const businessesTable = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  category: text("category").notNull().default("food"),
  description: text("description"),
  address: text("address").notNull(),
  city: text("city").notNull().default("Santiago"),
  phone: text("phone"),
  imageUrl: text("image_url"),
  logoUrl: text("logo_url"),
  lat: real("lat"),
  lng: real("lng"),
  isActive: boolean("is_active").notNull().default(true),
  isOpen: boolean("is_open").notNull().default(true),
  approvalStatus: text("approval_status").notNull().default("approved"),
  rating: real("rating").notNull().default(5.0),
  totalOrders: integer("total_orders").notNull().default(0),
  prepTimeMinutes: integer("prep_time_minutes").notNull().default(25),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;
