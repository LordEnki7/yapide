import { Router } from "express";
import Stripe from "stripe";
import { requireAuth } from "../lib/auth";
import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

router.get("/payments/config", (_req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

router.post("/payments/create-intent", requireAuth, async (req, res) => {
  try {
    const { orderId, currency = "dop" } = req.body;
    const sessionUserId = (req.session as any).userId;

    if (!orderId || typeof orderId !== "number") {
      return res.status(400).json({ error: "orderId is required" });
    }

    // ── Server-side amount: always read from DB, never trust client ──
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.customerId !== sessionUserId) {
      return res.status(403).json({ error: "Not your order" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(409).json({ error: "Order already paid" });
    }

    // Convert DOP to cents (Stripe requires smallest currency unit)
    const amountCents = Math.round(order.totalAmount * 100);
    if (amountCents < 50) {
      return res.status(400).json({ error: "Order amount too small" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: String(sessionUserId),
        orderId: String(orderId),
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    res.status(500).json({ error: "Payment error" });
  }
});

export default router;
