import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; entryId: string }> },
) {
  const { schoolSlug, entryId } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      subjectId,
      teacherId,
      classroomId,
      timeSlotId, // In case we move it
    } = await request.json();

    const entry = await prisma.timetableEntry.update({
      where: { id: entryId },
      data: {
        subjectId,
        teacherId,
        classroomId: classroomId || null,
        timeSlotId,
      },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
        timeSlot: true,
        classroom: true,
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Update Entry Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; entryId: string }> },
) {
  const { schoolSlug, entryId } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.timetableEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Entry Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
