import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
    }),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

const basePrisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

// Core models that implement soft delete
const softDeleteModels = ["student", "teacher", "staff", "guardian", "class", "subject"] as const;

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: { model: string; operation: string; args: any; query: any }) {
        const isSoftDeleteModel = softDeleteModels.includes(model.toLowerCase() as any);

        if (isSoftDeleteModel) {
          // 1. Handle Soft Delete write operations
          if (operation === "delete") {
            return (basePrisma as any)[model].update({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }
          if (operation === "deleteMany") {
            return (basePrisma as any)[model].updateMany({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }

          // 2. Handle Soft Delete read operations
          if (["findMany", "findFirst", "count"].includes(operation)) {
            if (args) {
              args.where = { deletedAt: null, ...args.where };
            }
          }
          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            const record = await query(args);
            if (record && (record as any).deletedAt !== undefined && (record as any).deletedAt !== null) {
              if (operation === "findUniqueOrThrow") {
                throw new Error("Record not found (soft deleted)");
              }
              return null;
            }
            return record;
          }
        }

        // 3. Fallback to normal query execution
        return query(args);
      },
    },
  },
});

/**
 * Execute operations within a Row Level Security (RLS) tenant-isolated transaction block.
 * Sets the 'app.current_school_id' session variable within a transaction to enforce RLS boundaries.
 */
export async function withTenantContext<T>(
  schoolId: string,
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return basePrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_school_id = '${schoolId.replace(/'/g, "''")}';`);
    // Wrap the transaction client with the soft delete extension to maintain the behavior
    const extendedTx = (tx as any).$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: { model: string; operation: string; args: any; query: any }) {
            const isSoftDeleteModel = softDeleteModels.includes(model.toLowerCase() as any);
            if (isSoftDeleteModel) {
              if (operation === "delete") {
                return (tx as any)[model].update({
                  where: args.where,
                  data: { deletedAt: new Date() },
                });
              }
              if (operation === "deleteMany") {
                return (tx as any)[model].updateMany({
                  where: args.where,
                  data: { deletedAt: new Date() },
                });
              }
              if (["findMany", "findFirst", "count"].includes(operation)) {
                if (args) {
                  args.where = { deletedAt: null, ...args.where };
                }
              }
              if (operation === "findUnique" || operation === "findUniqueOrThrow") {
                const record = await query(args);
                if (record && (record as any).deletedAt !== undefined && (record as any).deletedAt !== null) {
                  if (operation === "findUniqueOrThrow") {
                    throw new Error("Record not found (soft deleted)");
                  }
                  return null;
                }
                return record;
              }
            }
            return query(args);
          },
        },
      },
    });
    return fn(extendedTx as any);
  });
}

export default prisma;
