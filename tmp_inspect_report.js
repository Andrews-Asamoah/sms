const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const setId = 'cmmzgapcr009m7kt2gall0pil';
  const studentId = 'cmmv8fllj0043pkt2ll66wnfs';

  const report = await prisma.reportCard.findUnique({
    where: { setId_studentId: { setId, studentId } }
  });

  if (!report) {
    console.log("Not found");
    return;
  }

  console.log("--- SUBJECTS ---");
  console.log(JSON.stringify(report.data.subjects, null, 2));

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
