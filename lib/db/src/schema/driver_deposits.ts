import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { driversTable } from "./drivers";
import { usersTable } from "./users";

export const driverDepositsTable = pgTable("driver_deposits", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  adminId: integer("admin_id").references(() => usersTable.id),
  amountExpected: real("amount_expected").notNull().default(0),
  amountReceived: real("amount_received").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DriverDeposit = typeof driverDepositsTable.$inferSelect;
