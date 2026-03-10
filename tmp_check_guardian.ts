import { PrismaClient } from "@/lib/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "abena.quaicoo@mail.com"; // Let's try to guess or just fetch all guardians and their students
  const guardians = await prisma.guardian.findMany({
    include: {
      profile: true,
      students: {
        include: {
          student: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  for (const g of guardians) {
    if (
      g.students.some(
        (s) =>
          s.student.profile.firstName === "Abena" &&
          s.student.profile.lastName === "Quaicoo",
      )
    ) {
      console.log(JSON.stringify(g, null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
