// Creates (or resets) the admin account used by the Playwright E2E suite.
// Credentials come from the environment so nothing real is ever committed:
//   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
// Refuses to run without them, so it cannot touch a database by accident.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users, subscriptions } from "../src/db/schema";

async function main(): Promise<void> {
  const email = process.env["E2E_ADMIN_EMAIL"];
  const password = process.env["E2E_ADMIN_PASSWORD"];
  if (!email || !password) {
    throw new Error("E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, role: "admin" })
      .where(eq(users.id, existing.id));
    console.log(`seed-e2e-admin: reset ${email}`);
    return;
  }

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, role: "admin" })
    .returning();
  if (!user) throw new Error("admin insert returned no row");

  await db.insert(subscriptions).values({
    userId: user.id,
    plan: "free",
    status: "active",
  });
  console.log(`seed-e2e-admin: created ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
