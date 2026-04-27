import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";
import { usersTable } from "./users";

export const businessPayoutsTable = pgTable("business_payouts", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id),
  amount: real("amount").notNull(),
  payoutMethod: text("payout_method").notNull().default("efectivo"),
  reference: text("reference"),
  note: text("note"),
  paidBy: integer("paid_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BusinessPayout = typeof businessPayoutsTable.$inferSelect;
