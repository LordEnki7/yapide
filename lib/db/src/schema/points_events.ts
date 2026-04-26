import { pgTable, text, serial, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pointsEventsTable = pgTable("points_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  multiplier: real("multiplier").notNull().default(2),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPointsEventSchema = createInsertSchema(pointsEventsTable).omit({ id: true, createdAt: true });
export type InsertPointsEvent = z.infer<typeof insertPointsEventSchema>;
export type PointsEvent = typeof pointsEventsTable.$inferSelect;
