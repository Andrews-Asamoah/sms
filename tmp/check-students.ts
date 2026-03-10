import { PrismaClient } from "@/lib/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const schoolSlug = "wis";
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    console.log("School not found");
    return;
  }

  console.log(`School ID for '${schoolSlug}': ${school.id}`);

  const studentCount = await prisma.student.count({
    where: { schoolId: school.id },
  });
  console.log(`Total students in school: ${studentCount}`);

  const activeStudents = await prisma.student.count({
    where: { schoolId: school.id, status: "ACTIVE" },
  });
  console.log(`Active students in school: ${activeStudents}`);

  const unassignedStudents = await prisma.student.count({
    where: { schoolId: school.id, status: "ACTIVE", classId: null },
  });
  console.log(`Unassigned active students: ${unassignedStudents}`);

  const allStudents = await prisma.student.findMany({
    where: { schoolId: school.id },
    select: { id: true, studentId: true, status: true, classId: true },
    take: 10,
  });
  console.log("Sample students:", JSON.stringify(allStudents, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
