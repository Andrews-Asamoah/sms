import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  const setId = "cmplwgpii002jvct264rn3dhk";
  
  // We bypass the soft delete filter by querying basePrisma directly
  // wait, prisma is globalForPrisma.prisma, let's just query directly from the database or check if they are in the table.
  // Actually, to bypass prisma client extension we can use raw query or just fetch with deletedAt
  
  const set = await prisma.reportCardSet.findUnique({
    where: { id: setId },
    select: {
      id: true,
      name: true,
      classId: true,
      targetClasses: {
        select: {
          classId: true,
          class: {
            select: {
              id: true,
              name: true,
              deletedAt: true,
              students: {
                select: {
                  id: true,
                  status: true,
                  deletedAt: true,
                }
              }
            }
          }
        }
      }
    }
  });

  console.log("Set ID:", set?.id);
  console.log("Set Legacy Class ID:", set?.classId);
  
  console.log("\nTarget Classes:");
  set?.targetClasses.forEach(tc => {
    console.log(`- Class Name: ${tc.class.name}`);
    console.log(`  Class ID: ${tc.class.id}`);
    console.log(`  Class deletedAt: ${tc.class.deletedAt}`);
    console.log(`  Students count (all, including soft-deleted): ${tc.class.students.length}`);
  });

  // Let's check if the class IDs in targetClasses are soft-deleted or what.
  const rawClasses = await (prisma as any).class.findMany({
    where: {
      id: { in: set?.targetClasses.map(tc => tc.classId) || [] }
    }
  });
  console.log("\nRaw classes from database direct search:");
  rawClasses.forEach((c: any) => {
    console.log(`- ${c.name} (${c.id}) deletedAt=${c.deletedAt}`);
  });
}

main().catch(console.error);
