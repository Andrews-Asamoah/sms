import prisma from './lib/prisma';
async function main() {
  const s = await prisma.school.findFirst({select: {name: true, logo: true}});
  console.log(s);
}
main().finally(() => prisma.$disconnect());
