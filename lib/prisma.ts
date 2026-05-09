// @lib/prisma.ts
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;

// // @lib/prisma.ts
// import { PrismaClient } from "@/lib/generated/prisma/client";
// import { withAccelerate } from "@prisma/extension-accelerate";

// const globalForPrisma = globalThis as unknown as {
//   prisma: ReturnType<typeof createPrismaClient> | undefined;
// };

// function createPrismaClient() {
//   const accelerateUrl = process.env.DATABASE_URL;
//   if (!accelerateUrl) {
//     throw new Error("DATABASE_URL is not set");
//   }
//   return new PrismaClient({ accelerateUrl }).$extends(withAccelerate());
// }

// const prisma = globalForPrisma.prisma ?? createPrismaClient();

// if (process.env.NODE_ENV !== "production") {
//   globalForPrisma.prisma = prisma;
// }

// export default prisma;
