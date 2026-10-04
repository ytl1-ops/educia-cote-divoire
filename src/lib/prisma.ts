import { PrismaClient } from "@prisma/client";

const globalPourPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalPourPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalPourPrisma.prisma = prisma;
}
