import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createSetSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  termId: z.string().min(1, "Term is required"),
  classIds: z.array(z.string()).min(1, "At least one class is required"),
  name: z.string().min(1, "Name is required"),
  publishAt: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
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

    const sets = await prisma.reportCardSet.findMany({
      where: { schoolId: school.id },
      include: {
        template: true,
        academicYear: true,
        term: true,
        class: true,
        targetClasses: {
          include: {
            class: true,
          }
        },
        _count: {
          select: { reportCards: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sets);
  } catch (error) {
    console.error("[REPORT_CARD_SETS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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
      !session.isSuperAdmin
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSetSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    const { classIds, ...rest } = validatedData;

    const set = await prisma.reportCardSet.create({
      data: {
        ...rest,
        schoolId: school.id,
        // For backward compatibility, use the first class as the primary classId
        classId: classIds[0],
        publishAt: validatedData.publishAt
          ? new Date(validatedData.publishAt)
          : null,
        targetClasses: {
          create: classIds.map((id) => ({
            classId: id,
          })),
        },
      },
      include: {
        template: true,
        academicYear: true,
        term: true,
        class: true,
        targetClasses: true,
      },
    });

    revalidatePath(`/${schoolSlug}/admin/reports/report-cards`);

    return NextResponse.json(set);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.flatten()), { status: 400 });
    }
    console.error("[REPORT_CARD_SETS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
