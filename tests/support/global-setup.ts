import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/**
 * Integration tests run against a dedicated PostgreSQL database (never the dev database).
 * Default: borrowly_test on the local server started by `npm run db:local`.
 * Override with TEST_DATABASE_URL.
 */
export default async function setup() {
  const base = "postgresql://borrowly:borrowly@127.0.0.1:5433/borrowly";
  const testUrl = process.env.TEST_DATABASE_URL ?? base.replace(/\/[^/?]+(\?|$)/, "/borrowly_test$1");
  if (!process.env.TEST_DATABASE_URL) {
    const admin = new PrismaClient({ datasources: { db: { url: base } } });
    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE borrowly_test ENCODING 'UTF8' TEMPLATE template0`);
    } catch {
      // already exists
    } finally {
      await admin.$disconnect();
    }
  }
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl }, stdio: "pipe" });
}
