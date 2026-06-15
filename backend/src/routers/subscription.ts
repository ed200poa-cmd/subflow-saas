import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { subscriptions } from "../db/schema";
import { stripe, PLANS, type PlanKey } from "../stripe";

export const subscriptionRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
    return sub;
  }),

  create: protectedProcedure
    .input(z.object({ plan: z.enum(["pro", "enterprise"]) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      const planConfig = PLANS[input.plan];
      if (!planConfig.priceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });
      }

      let customerId = existing?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.user.email,
          metadata: { userId: ctx.user.id },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: planConfig.priceId, quantity: 1 }],
        success_url: `${process.env["FRONTEND_URL"] ?? "http://localhost:5173"}/dashboard?success=true`,
        cancel_url: `${process.env["FRONTEND_URL"] ?? "http://localhost:5173"}/pricing`,
        metadata: { userId: ctx.user.id, plan: input.plan },
      });

      if (existing) {
        await ctx.db
          .update(subscriptions)
          .set({ stripeCustomerId: customerId, updatedAt: new Date() })
          .where(eq(subscriptions.userId, ctx.user.id));
      }

      return { checkoutUrl: session.url };
    }),

  upgrade: protectedProcedure
    .input(z.object({ plan: z.enum(["pro", "enterprise"]) }))
    .mutation(async ({ ctx, input }) => {
      const [sub] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (!sub?.stripeSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription",
        });
      }

      const planConfig = PLANS[input.plan];
      if (!planConfig.priceId) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const stripeSub = await stripe.subscriptions.retrieve(
        sub.stripeSubscriptionId
      );
      const itemId = stripeSub.items.data[0]?.id;
      if (!itemId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        items: [{ id: itemId, price: planConfig.priceId }],
        proration_behavior: "always_invoice",
      });

      await ctx.db
        .update(subscriptions)
        .set({ plan: input.plan as PlanKey, updatedAt: new Date() })
        .where(eq(subscriptions.userId, ctx.user.id));

      return { success: true };
    }),

  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub?.stripeSubscriptionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active subscription to cancel",
      });
    }

    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);

    await ctx.db
      .update(subscriptions)
      .set({ status: "canceled", plan: "free", updatedAt: new Date() })
      .where(eq(subscriptions.userId, ctx.user.id));

    return { success: true };
  }),

  portalUrl: protectedProcedure.mutation(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub?.stripeCustomerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No billing account" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env["FRONTEND_URL"] ?? "http://localhost:5173"}/dashboard`,
    });

    return { url: session.url };
  }),
});
