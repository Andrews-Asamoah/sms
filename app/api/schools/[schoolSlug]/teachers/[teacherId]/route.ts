import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { z } from "zod";

const teacherUpdateSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  otherNames: z.string().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),

  staffNumber: z.string().nullable().optional(),
  departmentId: z.string().min(1).optional(),
  houseId: z.string().nullable().optional(),
  qualification: z.string().nullable().optional(),
  specialization: z.string().nullable().optional(),
  experience: z.number().nullable().optional(),
  employmentType: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", "INTERN"])
    .optional(),
  hireDate: z.string().optional(),
  contractEndDate: z.string().nullable().optional(),
  monthlySalary: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; teacherId: string }> },
) {
  try {
    const { schoolSlug, teacherId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if teacher exists and belongs to the school
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { school: true },
    });

    if (!teacher || teacher.school.subdomain !== schoolSlug) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Perform delete
    // Note: This will not delete the UserProfile or User, only the Teacher record
    await prisma.teacher.delete({
      where: { id: teacherId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; teacherId: string }> },
) {
  try {
    const { schoolSlug, teacherId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const result = teacherUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const data = result.data;

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { school: true, profile: true },
    });

    if (!teacher || teacher.school.subdomain !== schoolSlug) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const formatDate = (dateString?: string) =>
      dateString ? new Date(dateString) : undefined;

    // Update Transaction (Profile + Teacher)
    const updatedTeacher = await prisma.$transaction(async (tx) => {
      // Update Profile if it exists
      if (teacher.profileId) {
        await tx.userProfile.update({
          where: { id: teacher.profileId },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            otherNames: data.otherNames,
            gender: data.gender,
            dateOfBirth: formatDate(data.dateOfBirth),
            phone: data.phone,
          },
        });
      }

      // Update Teacher
      return await tx.teacher.update({
        where: { id: teacherId },
        data: {
          staffNumber: data.staffNumber,
          departmentId: data.departmentId,
          houseId: data.houseId || null,
          qualification: data.qualification,
          specialization: data.specialization,
          experience: data.experience,
          employmentType: data.employmentType,
          hireDate: formatDate(data.hireDate),
          contractEndDate: data.contractEndDate
            ? new Date(data.contractEndDate)
            : data.contractEndDate === null
              ? null
              : undefined,
          monthlySalary: data.monthlySalary,
          isActive: data.isActive,
        },
      });
    });

    return NextResponse.json(updatedTeacher);
  } catch (error) {
    console.error("Error updating teacher:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
