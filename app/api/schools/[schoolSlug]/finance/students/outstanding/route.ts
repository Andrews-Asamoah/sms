import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school)
    return NextResponse.json({ error: "School not found" }, { status: 404 });

  // Find students with outstanding bills
  // OR just check the student.outstandingBalance field if we maintain it securely.
  // The schema has `outstandingBalance` on Student model.

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      outstandingBalance: { gt: 0 },
    },
    include: {
      profile: {
        select: { firstName: true, lastName: true, phone: true },
      },
      class: {
        select: { name: true },
      },
    },
    orderBy: { outstandingBalance: "desc" },
  });

  return NextResponse.json(students);
}
