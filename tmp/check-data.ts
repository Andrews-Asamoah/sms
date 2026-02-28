import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const schoolSlug = "wis";
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      academicYears: {
        where: { isCurrent: true },
      },
      classes: {
        include: {
          _count: {
            select: { students: true },
          },
        },
      },
    },
  });

  if (!school) {
    console.log("School not found:", schoolSlug);
    return;
  }

  console.log("School:", school.name, "ID:", school.id);
  console.log(
    "Current Academic Year:",
    school.academicYears[0]?.name || "NONE",
  );

  const students = await prisma.student.groupBy({
    by: ["classId", "status"],
    where: { schoolId: school.id },
    _count: true,
  });

  console.log("Student counts by class and status:");
  for (const group of students) {
    const className =
      school.classes.find((c) => c.id === group.classId)?.name ||
      "Unknown Class";
    console.log(
      `Class: ${className} (${group.classId}), Status: ${group.status}, Count: ${group._count}`,
    );
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
