import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { driversTable } from "./drivers";
import { ordersTable } from "./orders";

export const driverReportsTable = pgTable("driver_reports", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  reason: text("reason").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DriverReport = typeof driverReportsTable.$inferSelect;
