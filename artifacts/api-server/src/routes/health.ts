import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get(["/health", "/healthz"], async (_req, res) => {
  const checks: Record<string, string> = {};
  let allOk = true;

  try {
    await db.execute(sql`SELECT 1`);
    checks.db = "ok";
  } catch (err) {
    checks.db = "error";
    allOk = false;
  }

  const status = allOk ? "ok" : "degraded";
  const data = HealthCheckResponse.parse({ status });

  res.status(allOk ? 200 : 503).json({
    ...data,
    checks,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
  });
});

export default router;
