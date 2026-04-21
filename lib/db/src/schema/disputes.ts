import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";
import { usersTable } from "./users";

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  customerId: integer("customer_id").notNull().references(() => usersTable.id),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  refundAmount: real("refund_amount"),
  adminNotes: text("admin_notes"),
  resolvedById: integer("resolved_by_id").references(() => usersTable.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Dispute = typeof disputesTable.$inferSelect;
