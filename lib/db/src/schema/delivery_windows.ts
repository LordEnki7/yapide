import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryWindowsTable = pgTable("delivery_windows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dayOfWeek: integer("day_of_week"),
  specificDate: text("specific_date"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeliveryWindowSchema = createInsertSchema(deliveryWindowsTable).omit({ id: true, createdAt: true });
export type InsertDeliveryWindow = z.infer<typeof insertDeliveryWindowSchema>;
export type DeliveryWindow = typeof deliveryWindowsTable.$inferSelect;
