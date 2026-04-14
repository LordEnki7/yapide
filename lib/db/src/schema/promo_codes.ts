import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull().default("fixed"),
  discountValue: real("discount_value").notNull(),
  minOrder: real("min_order").notNull().default(0),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PromoCode = typeof promoCodesTable.$inferSelect;
