import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const writeRemarkSchema = z.object({
  studentId: z.string().min(1),
  termId: z.string().min(1),
  remarkType: z.enum([
    "ACADEMIC",
    "BEHAVIORAL",
    "ATTENDANCE",
    "GENERAL",
    "ACHIEVEMENT",
    "CONCERN",
  ]),
  content: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      role?.effectiveRole !== "teacher" &&
      role?.effectiveRole !== "headteacher" &&
      !session.isSuperAdmin
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { studentId, termId, remarkType, content } =
      writeRemarkSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    // Resolve teacher record from the current user
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId: school.id,
        profile: { userId: session.user.id },
      },
      select: { id: true },
    });

    if (!teacher) {
      return new NextResponse(
        "Teacher record not found for the current user",
        { status: 404 },
      );
    }

    // Manual upsert since Remark model lacks composite unique constraint
    const existingRemark = await prisma.remark.findFirst({
      where: {
        studentId,
        termId,
        remarkType: remarkType as any,
      },
    });

    let remark;
    if (existingRemark) {
      remark = await prisma.remark.update({
        where: { id: existingRemark.id },
        data: {
          content,
          teacherId: teacher.id,
        },
      });
    } else {
      remark = await prisma.remark.create({
        data: {
          studentId,
          termId,
          remarkType: remarkType as any,
          content,
          teacherId: teacher.id,
        },
      });
    }

    return NextResponse.json(remark);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error("[REMARKS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");

    if (!studentId || !termId) {
      return new NextResponse("Missing studentId or termId", { status: 400 });
    }

    const remarks = await prisma.remark.findMany({
      where: {
        studentId,
        termId,
      },
    });

    return NextResponse.json(remarks);
  } catch (error) {
    console.error("[REMARKS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
