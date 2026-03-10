import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; slotId: string }> },
) {
  const { schoolSlug, slotId } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { dayOfWeek, startTime, endTime, label } = await request.json();

    const slot = await prisma.timeSlot.update({
      where: { id: slotId },
      data: {
        dayOfWeek,
        startTime,
        endTime,
        label,
      },
    });

    return NextResponse.json(slot);
  } catch (error) {
    console.error("Update Slot Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; slotId: string }> },
) {
  const { schoolSlug, slotId } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.timeSlot.delete({
      where: { id: slotId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Slot Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
