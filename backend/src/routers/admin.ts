import { count, sum, eq, desc, gte } from "drizzle-orm";
import { router, adminProcedure } from "../trpc";
import { users, subscriptions, payments, usageLogs } from "../db/schema";

export const adminRouter = router({
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [totalUsers] = await ctx.db.select({ total: count() }).from(users);

    const [activeSubscribers] = await ctx.db
      .select({ total: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const [canceledSubs] = await ctx.db
      .select({ total: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "canceled"));

    const [totalRevenue] = await ctx.db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.status, "succeeded"));

    const [monthlyRevenue] = await ctx.db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.status, "succeeded"));

    const totalActive = activeSubscribers?.total ?? 0;
    const totalCanceled = canceledSubs?.total ?? 0;
    const churnRate =
      totalActive + totalCanceled > 0
        ? Math.round((totalCanceled / (totalActive + totalCanceled)) * 100)
        : 0;

    return {
      totalUsers: totalUsers?.total ?? 0,
      activeSubscribers: totalActive,
      churnRate,
      totalRevenueCents: Number(totalRevenue?.total ?? 0),
      monthlyRevenueCents: Number(monthlyRevenue?.total ?? 0),
    };
  }),

  getUsers: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        plan: subscriptions.plan,
        subscriptionStatus: subscriptions.status,
      })
      .from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .orderBy(desc(users.createdAt))
      .limit(100);

    return result;
  }),

  getRevenue: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        stripePaymentId: payments.stripePaymentId,
        createdAt: payments.createdAt,
        userEmail: users.email,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt))
      .limit(50);

    return result;
  }),

  getUsageStats: adminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalCalls] = await ctx.db
      .select({ total: count() })
      .from(usageLogs)
      .where(gte(usageLogs.timestamp, thirtyDaysAgo));

    const topEndpoints = await ctx.db
      .select({
        endpoint: usageLogs.endpoint,
        calls: count(),
      })
      .from(usageLogs)
      .where(gte(usageLogs.timestamp, thirtyDaysAgo))
      .groupBy(usageLogs.endpoint)
      .orderBy(desc(count()))
      .limit(10);

    return {
      totalCallsThisMonth: totalCalls?.total ?? 0,
      topEndpoints,
    };
  }),
});
