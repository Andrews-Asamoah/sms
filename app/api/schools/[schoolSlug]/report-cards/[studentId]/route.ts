import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  try {
    const { schoolSlug, studentId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    // Get the most recent published report card for this student
    const reportCard = await prisma.reportCard.findFirst({
      where: {
        studentId: studentId,
        set: {
          schoolId: school.id,
          // If not admin, only show published ones
          ...(role.effectiveRole === "student" ||
          role.effectiveRole === "guardian"
            ? { status: "PUBLISHED" }
            : {}),
        },
      },
      include: {
        set: {
          include: {
            template: true,
            academicYear: true,
            term: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!reportCard) {
      return new NextResponse("Report card not found", { status: 404 });
    }

    return NextResponse.json(reportCard);
  } catch (error) {
    console.error("[REPORT_CARD_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
