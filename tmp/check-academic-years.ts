import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const schoolSlug = "wis";
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    console.log("School 'wis' not found");
    return;
  }

  console.log(`Found school: ${school.name} (ID: ${school.id})`);

  const academicYears = await prisma.academicYear.findMany({
    where: { schoolId: school.id },
  });

  console.log("Academic Years for school 'wis':");
  if (academicYears.length === 0) {
    console.log("No academic years found.");
  } else {
    academicYears.forEach((ay) => {
      console.log(
        `- ${ay.name}: ID=${ay.id}, isCurrent=${ay.isCurrent}, startDate=${ay.startDate}, endDate=${ay.endDate}`,
      );
    });
  }

  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });

  console.log(
    "\nCurrent Year (isCurrent: true):",
    currentYear ? currentYear.name : "None",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
