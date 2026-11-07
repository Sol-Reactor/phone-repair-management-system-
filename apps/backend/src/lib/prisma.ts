import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance (avoids exhausting DB connections
// under ts-node-dev's hot-reload, which would otherwise create a new
// client on every file change).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
