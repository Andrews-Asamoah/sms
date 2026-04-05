const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolSlug = 'hdm';
  
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug }
  });
  
  if (!school) {
    console.log("School not found");
    return;
  }
  
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    include: { department: true },
    take: 5
  });
  
  const subjects = await prisma.subject.findMany({
    where: { schoolId: school.id },
    include: { departments: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log("=== CLASSES ===");
  classes.forEach(c => console.log(`${c.name} (${c.slug}) -> Dept: ${c.department?.name || 'None'} [${c.departmentId || 'null'}]`));
  
  console.log("\n=== RECENT SUBJECTS ===");
  subjects.forEach(s => {
    console.log(`${s.name} (${s.code}) -> Depts:`, s.departments.map(d => `${d.name} [${d.id}]`).join(', '));
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
