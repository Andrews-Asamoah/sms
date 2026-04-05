import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { z } from "zod";

const staffUpdateSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  otherNames: z.string().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().nullable().optional(),
  
  staffType: z.enum([
    "ACCOUNTANT", "ADMIN", "LIBRARIAN", "DRIVER", "SECURITY", 
    "NURSE", "COUNSELOR", "IT_SUPPORT", "RECEPTIONIST", 
    "COOK", "CLEANER", "OTHER"
  ]).optional(),
  jobTitle: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  staffNumber: z.string().nullable().optional(),
  employmentType: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", "INTERN"])
    .optional(),
  hireDate: z.string().optional(),
  contractEndDate: z.string().nullable().optional(),
  monthlySalary: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; staffId: string }> },
) {
  try {
    const { schoolSlug, staffId } = await params;
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
    const result = staffUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const data = result.data;

    // Check if staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { school: true, profile: true },
    });

    if (!staff || staff.school.subdomain !== schoolSlug) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const formatDate = (dateString?: string) =>
      dateString ? new Date(dateString) : undefined;

    // Update Transaction (Profile + Staff)
    const updatedStaff = await prisma.$transaction(async (tx) => {
      // Update Profile if it exists
      if (staff.profileId) {
        await tx.userProfile.update({
          where: { id: staff.profileId },
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

      // Update Staff
      return await tx.staff.update({
        where: { id: staffId },
        data: {
          staffType: data.staffType,
          jobTitle: data.jobTitle,
          departmentId: data.departmentId,
          staffNumber: data.staffNumber,
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

    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
