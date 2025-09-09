// lib/db.ts
import { PrismaClient } from "@prisma/client";

// ❗ Ensure we have a postgres:// URL at runtime (not prisma://)
if (!process.env.POSTGRES_URL) {
  throw new Error("Missing POSTGRES_URL (postgres connection string)");
}

// Reuse a single client in dev to avoid too many connections
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log: ["error", "warn"], // <- optional: uncomment to see DB logs in prod
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
