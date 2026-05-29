import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  // Let's count students by class ID and status
  const classes = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
    }
  });

  console.log("Classes in DB:");
  for (const c of classes) {
    const activeCount = await prisma.student.count({
      where: {
        classId: c.id,
        status: "ACTIVE"
      }
    });
    const totalCount = await prisma.student.count({
      where: {
        classId: c.id
      }
    });
    console.log(`- ${c.name} (${c.id}): active=${activeCount}, total=${totalCount}`);
  }

  // Let's run a query that replicates page.tsx query directly to see what it yields
  const setId = "cmplwgpii002jvct264rn3dhk";
  const set = await prisma.reportCardSet.findUnique({
    where: { id: setId },
    select: {
      classId: true,
      targetClasses: {
        select: {
          classId: true,
          class: {
            select: {
              id: true,
              name: true,
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

  console.log("\nReplicating page.tsx query for targetClasses:");
  console.log("set.classId:", set?.classId);
  console.log("targetClasses details:");
  set?.targetClasses.forEach(tc => {
    console.log(`Class ${tc.class.name} (${tc.class.id}) students in include query:`, tc.class.students.length);
    if (tc.class.students.length > 0) {
      console.log("First 2 students status/deletedAt:", tc.class.students.slice(0, 2));
    }
  });
}

main().catch(console.error);
