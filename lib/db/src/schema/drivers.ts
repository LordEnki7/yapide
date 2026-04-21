import { pgTable, serial, timestamp, boolean, integer, real, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id).unique(),
  vehicleType: text("vehicle_type").notNull().default("moto"),
  vehiclePlate: text("vehicle_plate"),
  city: text("city").notNull().default("Santiago"),
  isOnline: boolean("is_online").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  approvalStatus: text("approval_status").notNull().default("approved"),
  rating: real("rating").notNull().default(5.0),
  acceptanceRate: real("acceptance_rate").notNull().default(1.0),
  currentLat: real("current_lat"),
  currentLng: real("current_lng"),
  cashBalance: real("cash_balance").notNull().default(0),
  walletBalance: real("wallet_balance").notNull().default(0),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;
