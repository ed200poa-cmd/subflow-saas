import Stripe from "stripe";
import { Request, Response } from "express";
import { db } from "./db";
import { subscriptions, payments } from "./db/schema";
import { eq } from "drizzle-orm";

export const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "", {
  apiVersion: "2024-04-10",
});

export const PLANS = {
  free: { name: "Free", price: 0, apiLimit: 100, priceId: null },
  pro: {
    name: "Pro",
    price: 29,
    apiLimit: 10000,
    priceId: process.env["STRIPE_PRO_PRICE_ID"] ?? "",
  },
  enterprise: {
    name: "Enterprise",
    price: 99,
    apiLimit: Infinity,
    priceId: process.env["STRIPE_ENTERPRISE_PRICE_ID"] ?? "",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig ?? "",
      webhookSecret
    );
  } catch (err) {
    res.status(400).send(`Webhook Error: ${String(err)}`);
    return;
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const customerId = pi.customer as string | null;
      if (!customerId) break;

      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, customerId))
        .limit(1);

      if (sub) {
        await db.insert(payments).values({
          userId: sub.userId,
          amount: pi.amount,
          currency: pi.currency,
          status: "succeeded",
          stripePaymentId: pi.id,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const deletedSub = event.data.object as Stripe.Subscription;
      await db
        .update(subscriptions)
        .set({ status: "canceled", plan: "free", updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, deletedSub.id));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.subscription as string | null;
      if (!subId) break;

      await db
        .update(subscriptions)
        .set({ status: "past_due", updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, subId));
      break;
    }

    default:
      break;
  }

  res.json({ received: true });
}
