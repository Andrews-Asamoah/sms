import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { z } from "zod";

// Schema for teacher creation validation
const teacherCreateSchema = z.object({
  schoolId: z.string().min(1, "School ID is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  otherNames: z.string().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),

  staffNumber: z.string().nullable().optional(),
  departmentId: z.string().min(1, "Department is required"),
  houseId: z.string().nullable().optional(),
  qualification: z.string().nullable().optional(),
  specialization: z.string().nullable().optional(),
  experience: z.number().nullable().optional(),
  employmentType: z.enum([
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "TEMPORARY",
    "INTERN",
  ]),
  hireDate: z.string().min(1, "Hire date is required"),
  contractEndDate: z.string().nullable().optional(),
  monthlySalary: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const result = teacherCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const data = result.data;

    // Generate teacher ID (format: T-{YEAR}-{RANDOM})
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const teacherId = `T-${year}-${random}`;

    // Helper to format date
    const formatDate = (dateString: string) => new Date(dateString);

    // Transaction to create Profile and Teacher
    const teacher = await prisma.$transaction(async (tx) => {
      // 1. Create User Profile
      // Note: We're creating a standalone profile first.
      // If email exists and matches a User, we'd ideally link it, but for now
      // we'll create a profile that can be linked to a User later if they sign up.
      // However, UserProfile requires a unique userId in the schema?
      // Wait, schema says: userId String @unique. relationships: user User @relation...
      // This means a Profile MUST belong to a User.

      // Check if we can create a profile without a user.
      // Schema: model UserProfile { ... userId String @unique ... user User ... }
      // So we MUST have a User record to create a Profile.

      // Strategy:
      // 1. If email is provided, checking if User exists.
      // 2. If User exists, use their ID.
      // 3. If no User, we must create a User record. Since this is an admin adding a teacher,
      //    we can create a placeholder User.

      let userId: string;
      const email = data.email || `teacher-${teacherId}@placeholder.com`; // Fallback email if none provided

      let existingUser = null;
      if (data.email) {
        existingUser = await tx.user.findUnique({
          where: { email: data.email },
        });
      }

      if (existingUser) {
        userId = existingUser.id;
        // Check if this user already has a profile
        const existingProfile = await tx.userProfile.findUnique({
          where: { userId },
        });

        if (existingProfile) {
          // Check if this profile is already a teacher in THIS school
          const existingTeacher = await tx.teacher.findFirst({
            where: { profileId: existingProfile.id, schoolId: data.schoolId },
          });

          if (existingTeacher) {
            throw new Error("This user is already a teacher in this school");
          }

          // If profile exists but not a teacher in this school, we reuse the profile
          // But we can't overwrite their personal info without permission.
          // For simplicity, we'll just link the new Teacher record to the existing profile.
          return await tx.teacher.create({
            data: {
              teacherId,
              staffNumber: data.staffNumber,
              schoolId: data.schoolId,
              profileId: existingProfile.id,
              departmentId: data.departmentId,
              houseId: data.houseId || null,
              qualification: data.qualification,
              specialization: data.specialization,
              experience: data.experience,
              employmentType: data.employmentType,
              hireDate: formatDate(data.hireDate),
              contractEndDate: data.contractEndDate
                ? formatDate(data.contractEndDate)
                : null,
              monthlySalary: data.monthlySalary,
              isActive: data.isActive,
            },
          });
        }
      } else {
        // Create new User
        const newUser = await tx.user.create({
          data: {
            name: `${data.firstName} ${data.lastName}`,
            email: email,
            role: "user", // Default role
          },
        });
        userId = newUser.id;
      }

      // Create Profile
      const newProfile = await tx.userProfile.create({
        data: {
          userId: userId,
          firstName: data.firstName,
          lastName: data.lastName,
          otherNames: data.otherNames,
          gender: data.gender,
          dateOfBirth: formatDate(data.dateOfBirth),
          phone: data.phone,
          nationality: "Ghanaian", // Default
        },
      });

      // Create Teacher Linked to Profile
      return await tx.teacher.create({
        data: {
          teacherId,
          staffNumber: data.staffNumber,
          schoolId: data.schoolId,
          profileId: newProfile.id,
          departmentId: data.departmentId,
          houseId: data.houseId || null,
          qualification: data.qualification,
          specialization: data.specialization,
          experience: data.experience,
          employmentType: data.employmentType,
          hireDate: formatDate(data.hireDate),
          contractEndDate: data.contractEndDate
            ? formatDate(data.contractEndDate)
            : null,
          monthlySalary: data.monthlySalary,
          isActive: data.isActive,
        },
      });
    });

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("Error creating teacher:", error);
    if (error instanceof Error && error.message.includes("already a teacher")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
