import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import { existsSync } from "fs";
import { join } from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { generalLimiter } from "./lib/rate-limiters";
import { csrfMiddleware, csrfTokenHandler } from "./lib/csrf";
import { pool } from "@workspace/db";

const app: Express = express();

const isProd = process.env.NODE_ENV === "production";

// ─── Trust reverse proxy (Dokploy / Traefik / nginx) ─────────────────────────
// Required for express-rate-limit to correctly read X-Forwarded-For IPs
app.set("trust proxy", 1);

// ─── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// ─── Logging ─────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins: cors.CorsOptions["origin"] = isProd
  ? [
      "https://yapide.app",
      "https://www.yapide.app",
      /\.replit\.app$/,
      // Capacitor mobile app origins
      "https://localhost",
      "capacitor://localhost",
      "ionic://localhost",
    ]
  : true;

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ─── Body parsing (with size limits to prevent payload attacks) ───────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ─── Sessions ─────────────────────────────────────────────────────────────────
const sessionSecret = process.env.SESSION_SECRET ?? "qlq-super-secret-2024";
const sessionCookieDomain = process.env.SESSION_COOKIE_DOMAIN ?? undefined;

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      domain: sessionCookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// ─── General rate limiter ─────────────────────────────────────────────────────
app.use("/api", generalLimiter);

// ─── CSRF token endpoint (GET — no CSRF check needed) ────────────────────────
app.get("/api/csrf-token", csrfTokenHandler);

// ─── CSRF protection — validates X-CSRF-Token on all mutations ───────────────
// Skips: native mobile apps (no Origin header or capacitor://), GET/HEAD/OPTIONS
app.use("/api", csrfMiddleware);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Serve frontend static files (production only) ───────────────────────────
const frontendDist = process.env.FRONTEND_DIST ?? join("/app", "artifacts", "que-lo-que", "dist", "public");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/.*/, (_req: Request, res: Response) => {
    res.sendFile(join(frontendDist, "index.html"));
  });
} else {
  // ─── 404 (API-only mode, no frontend build present) ─────────────────────
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });
}

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any)?.status ?? (err as any)?.statusCode ?? 500;
  const message =
    err instanceof Error ? err.message : "Internal server error";

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  if (res.headersSent) return;

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
});

export default app;
