import { PrismaClient } from "@prisma/client";

// Singleton pattern for Prisma Client in Electron
// Prevents multiple instances during hot-reload in development
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Graceful shutdown
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
