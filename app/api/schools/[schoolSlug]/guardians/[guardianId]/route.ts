import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import * as z from "zod";

const updateGuardianSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required").optional().nullable(),
  phone: z.string().min(8, "Valid phone number is required"),
  alternatePhone: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  relationshipType: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
    "SIBLING",
    "RELATIVE",
    "OTHER",
  ]),
  isActive: z.boolean().optional(),
  wards: z
    .array(
      z.object({
        studentId: z.string().min(1, "Student is required"),
        isPrimary: z.boolean(),
      })
    )
    .optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; guardianId: string }> }
) {
  try {
    const { schoolSlug, guardianId } = await params;
    await requireSchoolAccess(schoolSlug);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const guardian = await prisma.guardian.findFirst({
      where: { id: guardianId, schoolId: school.id },
      include: {
        students: {
          include: {
            student: {
              include: {
                profile: true,
                class: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!guardian) {
      return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
    }

    return NextResponse.json(guardian);
  } catch (error) {
    console.error("❌ Error fetching guardian:", error);
    return NextResponse.json(
      { error: "Failed to fetch guardian details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; guardianId: string }> }
) {
  try {
    const { schoolSlug, guardianId } = await params;
    await requireSchoolAccess(schoolSlug);

    const body = await request.json();
    const data = updateGuardianSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const existingGuardian = await prisma.guardian.findFirst({
      where: { id: guardianId, schoolId: school.id },
      include: { profile: true },
    });

    if (!existingGuardian) {
      return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
    }

    // Update Guardian record and wards in a transaction
    const updatedGuardian = await prisma.$transaction(async (tx) => {
      // 1. Update Guardian record
      const updated = await tx.guardian.update({
        where: { id: guardianId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone,
          alternatePhone: data.alternatePhone || null,
          occupation: data.occupation || null,
          relationshipType: data.relationshipType,
          isActive: data.isActive !== undefined ? data.isActive : existingGuardian.isActive,
        },
      });

      // 2. Update associated UserProfile if linked
      if (existingGuardian.profileId) {
        await tx.userProfile.update({
          where: { id: existingGuardian.profileId },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            alternatePhone: data.alternatePhone || null,
          },
        }).catch((err) => console.warn("Failed to update profile for guardian:", err));
      }

      // 3. Update Wards if provided
      if (data.wards) {
        // Delete existing ward links
        await tx.guardianStudent.deleteMany({
          where: { guardianId: guardianId },
        });

        // Re-create ward links
        if (data.wards.length > 0) {
          await Promise.all(
            data.wards.map((ward) =>
              tx.guardianStudent.create({
                data: {
                  guardianId: guardianId,
                  studentId: ward.studentId,
                  isPrimary: ward.isPrimary,
                },
              })
            )
          );
        }
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: updatedGuardian,
    });
  } catch (error) {
    console.error("❌ Error updating guardian:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update guardian info" },
      { status: 500 }
    );
  }
}
