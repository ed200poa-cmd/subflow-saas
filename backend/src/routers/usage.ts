import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, gte, count } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { usageLogs, subscriptions } from "../db/schema";
import { PLANS, type PlanKey } from "../stripe";

export const usageRouter = router({
  track: protectedProcedure
    .input(z.object({ endpoint: z.string().max(255) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(usageLogs).values({
        userId: ctx.user.id,
        endpoint: input.endpoint,
      });
      return { tracked: true };
    }),

  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    const periodStart = sub?.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [result] = await ctx.db
      .select({ total: count() })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.userId, ctx.user.id),
          gte(usageLogs.timestamp, periodStart)
        )
      );

    return {
      used: result?.total ?? 0,
      plan: sub?.plan ?? "free",
      periodStart,
    };
  }),

  getLimits: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    const plan = (sub?.plan ?? "free") as PlanKey;
    const planConfig = PLANS[plan];

    if (planConfig.apiLimit === Infinity) {
      return { limit: null, plan };
    }

    return { limit: planConfig.apiLimit, plan };
  }),

  checkLimit: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    const plan = (sub?.plan ?? "free") as PlanKey;
    const planConfig = PLANS[plan];

    if (planConfig.apiLimit === Infinity) {
      return { allowed: true, remaining: null };
    }

    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [result] = await ctx.db
      .select({ total: count() })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.userId, ctx.user.id),
          gte(usageLogs.timestamp, periodStart)
        )
      );

    const used = result?.total ?? 0;
    const remaining = planConfig.apiLimit - used;

    if (remaining <= 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "API limit reached. Please upgrade your plan.",
      });
    }

    return { allowed: true, remaining };
  }),
});
