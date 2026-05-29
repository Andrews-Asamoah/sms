import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  const setId = "cmplwgpii002jvct264rn3dhk";

  const reportCards = await prisma.reportCard.findMany({
    where: { setId },
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          id: true,
          classId: true,
          class: {
            select: {
              name: true,
            }
          },
          profile: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        }
      }
    }
  });

  console.log(`Total report cards: ${reportCards.length}`);
  
  const classCountMap = new Map<string, number>();
  reportCards.forEach(rc => {
    const className = rc.student?.class?.name ?? "Unknown";
    classCountMap.set(className, (classCountMap.get(className) ?? 0) + 1);
  });

  console.log("\nReport cards by Class:");
  classCountMap.forEach((count, className) => {
    console.log(`- ${className}: ${count}`);
  });
}

main().catch(console.error);
