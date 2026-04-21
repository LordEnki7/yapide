import { rateLimit } from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

// Auth endpoints: max 10 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
  skip: () => !isProd,
});

// Order creation: max 30 orders per 10 minutes per IP
export const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: () => !isProd,
});

// Support chat: max 30 messages per minute per IP
export const supportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment." },
  skip: () => !isProd,
});

// General API limiter: 300 req / min per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: () => !isProd,
});
