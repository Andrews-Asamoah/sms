import * as dotenv from "dotenv";
import * as path from "path";

// Load dotenv
dotenv.config({ path: path.join(__dirname, "../.env") });

import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== TERMS ===");
  const terms = await prisma.term.findMany({
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      academicYear: {
        select: {
          id: true,
          name: true,
          schoolId: true,
        }
      }
    }
  });
  console.log(JSON.stringify(terms, null, 2));

  console.log("\n=== REPORT CARD SETS ===");
  const sets = await prisma.reportCardSet.findMany({
    select: {
      id: true,
      name: true,
      termId: true,
      academicYearId: true,
      schoolId: true,
    }
  });
  console.log(JSON.stringify(sets, null, 2));

  console.log("\n=== REMARKS ===");
  const remarks = await prisma.remark.findMany({
    take: 20,
    select: {
      id: true,
      studentId: true,
      termId: true,
      remarkType: true,
      content: true,
    }
  });
  console.log(JSON.stringify(remarks, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
