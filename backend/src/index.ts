import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./trpc";
import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { subscriptionRouter } from "./routers/subscription";
import { usageRouter } from "./routers/usage";
import { adminRouter } from "./routers/admin";
import { handleWebhook } from "./stripe";

const appRouter = router({
  auth: authRouter,
  subscription: subscriptionRouter,
  usage: usageRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

const app = express();

app.use(
  cors({
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:5173",
    credentials: true,
  })
);

// Stripe webhooks require raw body — must be before express.json()
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const PORT = Number(process.env["PORT"] ?? 3000);
app.listen(PORT, () => {
  console.log(`SubFlow backend running on port ${PORT}`);
});
