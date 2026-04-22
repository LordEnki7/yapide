import { Router } from "express";
import Stripe from "stripe";
import { requireAuth } from "../lib/auth";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

router.get("/payments/config", (_req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

router.post("/payments/create-intent", requireAuth, async (req, res) => {
  try {
    const { amount, currency = "dop", orderId } = req.body;

    if (!amount || typeof amount !== "number" || amount < 50) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: String((req.session as any).userId ?? ""),
        orderId: orderId ? String(orderId) : "",
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Payment error" });
  }
});

export default router;
