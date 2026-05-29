import prisma from "../lib/prisma";

async function main() {
  const setId = "cmplwgpii002jvct264rn3dhk";
  
  const set = await prisma.reportCardSet.findUnique({
    where: { id: setId },
    include: {
      academicYear: { select: { name: true } },
      term: { select: { name: true } },
      class: { 
        select: { 
          id: true, 
          name: true,
          students: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
        } 
      },
      targetClasses: {
        include: {
          class: {
            select: {
              id: true,
              name: true,
              students: {
                where: { status: "ACTIVE" },
                select: {
                  id: true,
                  profile: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      },
      reportCards: {
        select: {
          id: true,
          studentId: true,
          data: true,
        },
      },
    },
  });

  if (!set) {
    console.log("Set not found");
    return;
  }

  console.log("Set ID:", set.id);
  console.log("Set Name:", set.name);
  console.log("Legacy Class:", set.class?.name, "Students count:", set.class?.students.length ?? 0);
  console.log("Target Classes length:", set.targetClasses.length);
  for (const tc of set.targetClasses) {
    console.log(`Class name: ${tc.class.name}, ID: ${tc.class.id}, Students count: ${tc.class.students.length}`);
  }
  
  console.log("Total report cards fetched:", set.reportCards.length);
  
  // Show first 5 report cards
  console.log("Sample report cards (first 5):");
  set.reportCards.slice(0, 5).forEach(rc => {
    const student = set.targetClasses
      .flatMap(tc => tc.class.students)
      .find(s => s.id === rc.studentId);
    console.log(`- Student ID: ${rc.studentId}, Name: ${student ? `${student.profile.firstName} ${student.profile.lastName}` : "Unknown"}, Report ID: ${rc.id}`);
  });
}

main().catch(console.error);
