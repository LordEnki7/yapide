#!/usr/bin/env node
/**
 * Production migration script — runs SQL directly, no interactive prompts.
 * ALL statements use IF NOT EXISTS / DO $$ patterns — safe to run repeatedly.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function col(table, column, definition) {
  try {
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
    console.log(`  ✓ ${table}.${column}`);
  } catch (err) {
    console.log(`  – ${table}.${column}: ${err.message}`);
  }
}

async function constraint(label, sql) {
  try {
    await client.query(sql);
    console.log(`  ✓ constraint: ${label}`);
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log(`  – constraint: ${label} (already exists)`);
    } else {
      console.log(`  – constraint: ${label}: ${err.message}`);
    }
  }
}

async function createTable(label, sql) {
  try {
    await client.query(sql);
    console.log(`  ✓ table: ${label}`);
  } catch (err) {
    console.log(`  – table: ${label}: ${err.message}`);
  }
}

async function migrate() {
  await client.connect();
  console.log("Running YaPide migrations...");

  // ── users table ────────────────────────────────────────────────────────────
  await col("users", "pin_hash", "text");
  await col("users", "admin_role", "text");
  await col("users", "admin_permissions", "text");
  await col("users", "phone_verified", "boolean NOT NULL DEFAULT false");
  await col("users", "otp_code", "text");
  await col("users", "otp_expires_at", "timestamptz");
  await col("users", "points", "integer NOT NULL DEFAULT 0");
  await col("users", "referral_code", "text");
  await col("users", "referred_by_id", "integer");
  await col("users", "referral_bonus_paid", "boolean NOT NULL DEFAULT false");
  await col("users", "updated_at", "timestamptz NOT NULL DEFAULT now()");
  await constraint(
    "users_referral_code_unique",
    `ALTER TABLE users ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code)`
  );

  // ── businesses table ───────────────────────────────────────────────────────
  await col("businesses", "logo_url", "text");
  await col("businesses", "lat", "real");
  await col("businesses", "lng", "real");
  await col("businesses", "open_hours", "text");
  await col("businesses", "approval_status", "text NOT NULL DEFAULT 'approved'");
  await col("businesses", "is_featured", "boolean NOT NULL DEFAULT false");
  await col("businesses", "rating", "real NOT NULL DEFAULT 5.0");
  await col("businesses", "total_orders", "integer NOT NULL DEFAULT 0");
  await col("businesses", "prep_time_minutes", "integer NOT NULL DEFAULT 25");
  await col("businesses", "updated_at", "timestamptz NOT NULL DEFAULT now()");

  // ── drivers table ──────────────────────────────────────────────────────────
  await col("drivers", "city", "text NOT NULL DEFAULT 'Santiago'");
  await col("drivers", "is_locked", "boolean NOT NULL DEFAULT false");
  await col("drivers", "approval_status", "text NOT NULL DEFAULT 'approved'");
  await col("drivers", "acceptance_rate", "real NOT NULL DEFAULT 1.0");
  await col("drivers", "current_lat", "real");
  await col("drivers", "current_lng", "real");
  await col("drivers", "wallet_balance", "real NOT NULL DEFAULT 0");
  await col("drivers", "photo_url", "text");
  await col("drivers", "updated_at", "timestamptz NOT NULL DEFAULT now()");

  // ── orders table ──────────────────────────────────────────────────────────
  await col("orders", "commission", "real NOT NULL DEFAULT 0");
  await col("orders", "delivery_fee", "real NOT NULL DEFAULT 150");
  await col("orders", "driver_id", "integer");
  await col("orders", "delivery_address", "text");
  await col("orders", "delivery_lat", "real");
  await col("orders", "delivery_lng", "real");
  await col("orders", "notes", "text");
  await col("orders", "rating", "integer");
  await col("orders", "rating_comment", "text");
  await col("orders", "promo_code", "text");
  await col("orders", "discount_amount", "real NOT NULL DEFAULT 0");
  await col("orders", "driver_earnings", "real NOT NULL DEFAULT 0");
  await col("orders", "tip", "real NOT NULL DEFAULT 0");
  await col("orders", "payment_method", "text NOT NULL DEFAULT 'cash'");
  await col("orders", "is_paid", "boolean NOT NULL DEFAULT false");
  await col("orders", "customer_rating", "integer");
  await col("orders", "driver_rating", "integer");
  await col("orders", "business_rating", "integer");
  await col("orders", "delivery_photo_path", "text");
  await col("orders", "verification_pin", "text");
  await col("orders", "promo_discount", "real NOT NULL DEFAULT 0");
  await col("orders", "order_type", "text NOT NULL DEFAULT 'delivery'");
  await col("orders", "pickup_address", "text");
  await col("orders", "picking_status", "text NOT NULL DEFAULT 'not_required'");
  await col("orders", "requires_age_check", "boolean NOT NULL DEFAULT false");
  await col("orders", "age_verified", "boolean NOT NULL DEFAULT false");
  await col("orders", "scheduled_for", "timestamptz");
  await col("orders", "cash_settled", "boolean NOT NULL DEFAULT false");
  await col("orders", "business_paid", "boolean NOT NULL DEFAULT false");
  await col("orders", "updated_at", "timestamptz NOT NULL DEFAULT now()");

  // ── order_items table ──────────────────────────────────────────────────────
  await col("order_items", "picker_status", "text NOT NULL DEFAULT 'pending'");
  await col("order_items", "substitute_name", "text");
  await col("order_items", "substitute_price", "real");

  // ── new tables (create if not exists) ──────────────────────────────────────
  await createTable("banners", `
    CREATE TABLE IF NOT EXISTS banners (
      id serial PRIMARY KEY,
      title text NOT NULL,
      subtitle text,
      image_url text,
      bg_color text NOT NULL DEFAULT '#0057B7',
      cta_text text,
      cta_link text,
      is_active boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      starts_at timestamptz,
      ends_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await createTable("delivery_windows", `
    CREATE TABLE IF NOT EXISTS delivery_windows (
      id serial PRIMARY KEY,
      name text NOT NULL,
      day_of_week integer,
      specific_date text,
      start_time text NOT NULL,
      end_time text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await createTable("points_events", `
    CREATE TABLE IF NOT EXISTS points_events (
      id serial PRIMARY KEY,
      name text NOT NULL,
      multiplier real NOT NULL DEFAULT 1,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await createTable("business_payouts", `
    CREATE TABLE IF NOT EXISTS business_payouts (
      id serial PRIMARY KEY,
      business_id integer NOT NULL REFERENCES businesses(id),
      amount real NOT NULL,
      payout_method text NOT NULL DEFAULT 'efectivo',
      reference text,
      note text,
      paid_by integer REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await createTable("driver_deposits", `
    CREATE TABLE IF NOT EXISTS driver_deposits (
      id serial PRIMARY KEY,
      driver_id integer NOT NULL REFERENCES drivers(id),
      admin_id integer REFERENCES users(id),
      amount_expected real NOT NULL DEFAULT 0,
      amount_received real NOT NULL,
      note text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await createTable("disputes", `
    CREATE TABLE IF NOT EXISTS disputes (
      id serial PRIMARY KEY,
      order_id integer NOT NULL REFERENCES orders(id),
      customer_id integer NOT NULL REFERENCES users(id),
      reason text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'open',
      refund_amount real,
      admin_notes text,
      resolved_by_id integer REFERENCES users(id),
      resolved_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await createTable("driver_reports", `
    CREATE TABLE IF NOT EXISTS driver_reports (
      id serial PRIMARY KEY,
      driver_id integer NOT NULL REFERENCES drivers(id),
      order_id integer NOT NULL REFERENCES orders(id),
      reason text NOT NULL,
      notes text,
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await createTable("push_subscriptions", `
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id),
      endpoint text NOT NULL,
      p256dh text NOT NULL,
      auth text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await createTable("promo_codes", `
    CREATE TABLE IF NOT EXISTS promo_codes (
      id serial PRIMARY KEY,
      code text NOT NULL UNIQUE,
      discount_type text NOT NULL DEFAULT 'percent',
      discount_value real NOT NULL,
      min_order real NOT NULL DEFAULT 0,
      max_uses integer,
      uses_count integer NOT NULL DEFAULT 0,
      expires_at timestamptz,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await createTable("wallets", `
    CREATE TABLE IF NOT EXISTS wallets (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) UNIQUE,
      balance real NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await client.end();
  console.log("Migrations complete ✓");
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
