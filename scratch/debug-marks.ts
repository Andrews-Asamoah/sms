import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  console.log("=== Debugging Gradebook Loading ===");
  
  // Find school
  const school = await prisma.school.findFirst({
    where: { subdomain: "wis" }
  });
  
  if (!school) {
    console.error("School 'wis' not found!");
    return;
  }
  console.log(`School: ${school.name} (ID: ${school.id})`);

  // Find class
  const cls = await prisma.class.findFirst({
    where: {
      schoolId: school.id,
      OR: [{ slug: "basic-8b" }, { name: "Basic 8B" }]
    }
  });

  if (!cls) {
    console.error("Class 'basic-8b' not found!");
  } else {
    console.log(`Class: ${cls.name} (ID: ${cls.id}, Level: ${cls.level})`);
  }

  // Find class-subject assignments
  if (cls) {
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: cls.id },
      include: { subject: true }
    });
    console.log(`Assigned ClassSubjects: ${classSubjects.length}`);
    classSubjects.forEach(cs => {
      console.log(`  - CS ID: ${cs.id}, Subject: ${cs.subject.name} (ID: ${cs.subject.id}, Code: ${cs.subject.code}), Teacher ID: ${cs.teacherId}`);
    });

    if (classSubjects.length > 0) {
      const subjectId = classSubjects[0].subject.id;
      console.log(`Testing lookup for classId: ${cls.id} and subjectId: ${subjectId}`);
      
      const [classData, subjectData] = await Promise.all([
        prisma.class.findUnique({
          where: { id: cls.id },
          select: { level: true, name: true }
        }),
        prisma.subject.findUnique({
          where: { id: subjectId },
          select: { code: true, name: true }
        })
      ]);

      console.log(`Class Lookup Result: ${JSON.stringify(classData)}`);
      console.log(`Subject Lookup Result: ${JSON.stringify(subjectData)}`);
    }
  }

  // Find active templates
  const templates = await prisma.assessmentTemplate.findMany({
    where: { schoolId: school.id },
    include: { classes: true }
  });
  console.log(`Assessment Templates: ${templates.length}`);
  templates.forEach(t => {
    console.log(`  - Template: ${t.name} (ID: ${t.id}, isActive: ${t.isActive}, classId: ${t.classId}, level: ${t.classLevel}, subjectCode: ${t.subjectCode})`);
    t.classes.forEach(tc => {
      console.log(`    * Linked Class ID: ${tc.classId}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
