import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import * as z from "zod";

const addMembersSchema = z.object({
  studentIds: z.array(z.string()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; clubId: string }> },
) {
  try {
    const { schoolSlug, clubId } = await params;
    await requireSchoolAccess(schoolSlug);

    const body = await request.json();
    const { studentIds } = addMembersSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Add members in a transaction
    const members = await prisma.$transaction(
      studentIds.map((studentId) =>
        prisma.clubMember.create({
          data: {
            clubId,
            studentId,
            role: "MEMBER",
          },
        }),
      ),
    );

    return NextResponse.json(members);
  } catch (error) {
    console.error("❌ Error adding club members:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to add members" },
      { status: 500 },
    );
  }
}
