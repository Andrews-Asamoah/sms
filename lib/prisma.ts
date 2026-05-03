// // @lib/prisma.ts
// import { PrismaClient } from "@/lib/generated/prisma/client";
// import { PrismaPg } from "@prisma/adapter-pg";
// const adapter = new PrismaPg({
//   connectionString: process.env.DATABASE_URL!,
// });
// const globalForPrisma = global as unknown as {
//   prisma: PrismaClient;
// };
// const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     adapter,
//   });
// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
// export default prisma;

// @lib/prisma.ts
import { PrismaClient } from "@/lib/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as unknown as {
  prisma: ReturnType<typeof makePrismaClient>;
};

function makePrismaClient() {
  return new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL!,
  }).$extends(withAccelerate());
}

const prisma = globalForPrisma.prisma || makePrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
