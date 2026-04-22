import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"),
  role: text("role").notNull().default("customer"),
  // Admin sub-role: "owner" | "master" | "staff"
  adminRole: text("admin_role"),
  // JSON array of permission keys granted to this staff member
  adminPermissions: text("admin_permissions"),
  isBanned: boolean("is_banned").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  otpCode: text("otp_code"),
  otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
