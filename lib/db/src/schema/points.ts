import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const pointsTransactionsTable = pgTable("points_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPointsTransactionSchema = createInsertSchema(pointsTransactionsTable).omit({ id: true, createdAt: true });
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
export type PointsTransaction = typeof pointsTransactionsTable.$inferSelect;
