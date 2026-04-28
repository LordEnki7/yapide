#!/usr/bin/env node
/**
 * Production migration script — runs SQL directly, no interactive prompts.
 * Safe to run multiple times (all statements use IF NOT EXISTS / DO $$ patterns).
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run(label, sql) {
  try {
    await client.query(sql);
    console.log(`  ✓ ${label}`);
  } catch (err) {
    if (err.code === "42710" || err.code === "42P07" || err.message?.includes("already exists")) {
      console.log(`  – ${label} (already exists, skipped)`);
    } else {
      console.error(`  ✗ ${label}: ${err.message}`);
      throw err;
    }
  }
}

async function migrate() {
  await client.connect();
  console.log("Running migrations...");

  await run(
    "users.referral_code unique constraint",
    `ALTER TABLE users ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code)`
  );

  await client.end();
  console.log("Migrations complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
