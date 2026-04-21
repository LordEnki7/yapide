import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => ordersTable.id),
  channel: text("channel").notNull().default("whatsapp"),
  recipientPhone: text("recipient_phone"),
  recipientName: text("recipient_name"),
  recipientRole: text("recipient_role").notNull().default("customer"),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  sent: boolean("sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
