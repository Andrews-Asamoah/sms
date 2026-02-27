const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const schoolSlug = "wesley-international";
  console.log(`Checking school with subdomain: ${schoolSlug}`);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    console.log("School not found");
    return;
  }

  console.log(`Found school ID: ${school.id}`);

  try {
    const exams = await prisma.assessmentTemplate.findMany({
      where: { schoolId: school.id },
      include: {
        gradingSystem: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assessmentScores: true,
            components: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    console.log(`Found ${exams.length} exams`);
  } catch (error) {
    console.error("Error fetching exams:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
