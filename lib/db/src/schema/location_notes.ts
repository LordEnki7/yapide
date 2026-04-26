import { pgTable, serial, timestamp, integer, text } from "drizzle-orm/pg-core";
import { driversTable } from "./drivers";
import { ordersTable } from "./orders";

export const locationNotesTable = pgTable("location_notes", {
  id: serial("id").primaryKey(),
  addressText: text("address_text").notNull(),
  note: text("note").notNull(),
  driverId: integer("driver_id").references(() => driversTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
