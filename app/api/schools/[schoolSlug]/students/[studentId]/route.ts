// app/api/schools/[schoolSlug]/students/[studentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { Prisma } from "@/lib/generated/prisma/client";

const updateStudentSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  otherNames: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  phone: z.string().optional().nullable(),
  alternatePhone: z.string().optional().nullable(),
  residentialAddress: z.string().optional().nullable(),
  postalAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  country: z.string().optional(),
  admissionNumber: z.string().optional().nullable(),
  admissionDate: z.string().optional(),
  classId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  houseId: z.string().optional().nullable(),
  previousSchool: z.string().optional().nullable(),
  previousClass: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  medicalConditions: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyRelationship: z.string().optional().nullable(),
  status: z
    .enum([
      "ACTIVE",
      "GRADUATED",
      "WITHDRAWN",
      "SUSPENDED",
      "TRANSFERRED",
      "EXPELLED",
    ])
    .optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  try {
    const { schoolSlug, studentId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
        schoolId: school.id,
      },
      include: {
        profile: true,
        class: {
          include: { academicYear: true },
        },
        department: true,
        house: true,
        guardians: {
          include: {
            guardian: {
              include: {
                profile: true,
              },
            },
          },
        },
        bills: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        enrollments: {
          include: {
            class: true,
            academicYear: true,
            term: true,
          },
          orderBy: { enrolledAt: "desc" },
        },
        _count: {
          select: {
            guardians: true,
            bills: true,
            attendances: true,
            assessmentScores: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("[STUDENT_GET] Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  console.log("✏️ [Student Update] Starting update process...");

  try {
    const { schoolSlug, studentId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      console.log("❌ [Student Update] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateStudentSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      console.log("❌ [Student Update] School not found");
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const existingStudent = await prisma.student.findUnique({
      where: {
        id: studentId,
        schoolId: school.id,
      },
      include: { profile: true },
    });

    if (!existingStudent) {
      console.log("❌ [Student Update] Student not found");
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    console.log(
      `👤 [Student Update] Updating student: ${existingStudent.studentId}`,
    );

    // Check admission number uniqueness if being changed
    if (
      validatedData.admissionNumber &&
      validatedData.admissionNumber !== existingStudent.admissionNumber
    ) {
      const duplicate = await prisma.student.findFirst({
        where: {
          admissionNumber: validatedData.admissionNumber,
          schoolId: school.id,
          id: { not: studentId },
        },
      });

      if (duplicate) {
        console.log("❌ [Student Update] Admission number already exists");
        return NextResponse.json(
          { error: "Admission number already exists" },
          { status: 400 },
        );
      }
    }

    // Update in transaction
    console.log("💾 [Student Update] Starting database transaction...");
    const updatedStudent = await prisma.$transaction(async (tx) => {
      // Update profile
      const profileData: Partial<{
        firstName: string;
        lastName: string;
        otherNames: string | null;
        gender: "MALE" | "FEMALE" | "OTHER";
        dateOfBirth: Date;
        nationality: string;
        phone: string | null;
        alternatePhone: string | null;
        residentialAddress: string | null;
        postalAddress: string | null;
        city: string | null;
        region: string | null;
        country: string;
        emergencyContactName: string | null;
        emergencyContactPhone: string | null;
        emergencyRelationship: string | null;
      }> = {};

      if (validatedData.firstName)
        profileData.firstName = validatedData.firstName;
      if (validatedData.lastName) profileData.lastName = validatedData.lastName;
      if (validatedData.otherNames !== undefined)
        profileData.otherNames = validatedData.otherNames;
      if (validatedData.gender) profileData.gender = validatedData.gender;
      if (validatedData.dateOfBirth)
        profileData.dateOfBirth = new Date(validatedData.dateOfBirth);
      if (validatedData.nationality)
        profileData.nationality = validatedData.nationality;
      if (validatedData.phone !== undefined)
        profileData.phone = validatedData.phone;
      if (validatedData.alternatePhone !== undefined)
        profileData.alternatePhone = validatedData.alternatePhone;
      if (validatedData.residentialAddress !== undefined)
        profileData.residentialAddress = validatedData.residentialAddress;
      if (validatedData.postalAddress !== undefined)
        profileData.postalAddress = validatedData.postalAddress;
      if (validatedData.city !== undefined)
        profileData.city = validatedData.city;
      if (validatedData.region !== undefined)
        profileData.region = validatedData.region;
      if (validatedData.country) profileData.country = validatedData.country;
      if (validatedData.emergencyContactName !== undefined)
        profileData.emergencyContactName = validatedData.emergencyContactName;
      if (validatedData.emergencyContactPhone !== undefined)
        profileData.emergencyContactPhone = validatedData.emergencyContactPhone;
      if (validatedData.emergencyRelationship !== undefined)
        profileData.emergencyRelationship = validatedData.emergencyRelationship;

      if (Object.keys(profileData).length > 0) {
        console.log("📋 [Student Update] Updating profile...");
        await tx.userProfile.update({
          where: { id: existingStudent.profileId },
          data: profileData,
        });
      }

      // Update student
      const studentData: Partial<{
        admissionNumber: string | null;
        admissionDate: Date;
        classId: string | null;
        departmentId: string | null;
        houseId: string | null;
        previousSchool: string | null;
        previousClass: string | null;
        bloodGroup: string | null;
        allergies: string | null;
        medicalConditions: string | null;
        status:
          | "ACTIVE"
          | "GRADUATED"
          | "WITHDRAWN"
          | "SUSPENDED"
          | "TRANSFERRED"
          | "EXPELLED";
      }> = {};

      if (validatedData.admissionNumber !== undefined)
        studentData.admissionNumber = validatedData.admissionNumber;
      if (validatedData.admissionDate)
        studentData.admissionDate = new Date(validatedData.admissionDate);
      if (validatedData.classId !== undefined)
        studentData.classId = validatedData.classId;
      if (validatedData.departmentId !== undefined)
        studentData.departmentId = validatedData.departmentId;
      if (validatedData.houseId !== undefined)
        studentData.houseId = validatedData.houseId;
      if (validatedData.previousSchool !== undefined)
        studentData.previousSchool = validatedData.previousSchool;
      if (validatedData.previousClass !== undefined)
        studentData.previousClass = validatedData.previousClass;
      if (validatedData.bloodGroup !== undefined)
        studentData.bloodGroup = validatedData.bloodGroup;
      if (validatedData.allergies !== undefined)
        studentData.allergies = validatedData.allergies;
      if (validatedData.medicalConditions !== undefined)
        studentData.medicalConditions = validatedData.medicalConditions;
      if (validatedData.status) studentData.status = validatedData.status;

      console.log("🎓 [Student Update] Updating student record...");
      const student = await tx.student.update({
        where: { id: studentId },
        data: studentData,
        include: {
          profile: true,
          class: { include: { academicYear: true } },
          department: true,
          house: true,
        },
      });

      return student;
    });

    console.log("✅ [Student Update] Transaction completed successfully");

    // Log audit trail
    console.log("📝 [Audit] Creating audit log...");
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Student",
        entityId: studentId,
        oldValues: existingStudent as Prisma.InputJsonValue,
        newValues: updatedStudent as Prisma.InputJsonValue,
      },
    });

    console.log("✅ [Student Update] Process completed successfully\n");

    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error("❌ [Student Update] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  console.log("🗑️ [Student Delete] Starting deletion process...");

  try {
    const { schoolSlug, studentId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      console.log("❌ [Student Delete] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      console.log("❌ [Student Delete] School not found");
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
        schoolId: school.id,
      },
      include: {
        _count: {
          select: {
            bills: true,
            enrollments: true,
            assessmentScores: true,
          },
        },
      },
    });

    if (!student) {
      console.log("❌ [Student Delete] Student not found");
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    console.log(`👤 [Student Delete] Checking student: ${student.studentId}`);

    // Check if student has records
    if (
      student._count.bills > 0 ||
      student._count.enrollments > 0 ||
      student._count.assessmentScores > 0
    ) {
      console.log("❌ [Student Delete] Student has existing records");
      return NextResponse.json(
        {
          error:
            "Cannot delete student with existing records. Consider marking as withdrawn instead.",
        },
        { status: 400 },
      );
    }

    console.log("💾 [Student Delete] Deleting student...");
    // Delete student (cascade will handle related records)
    await prisma.student.delete({
      where: { id: studentId },
    });

    console.log("✅ [Student Delete] Student deleted successfully");

    // Log audit trail
    console.log("📝 [Audit] Creating audit log...");
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Student",
        entityId: studentId,
        oldValues: student as Prisma.InputJsonValue,
      },
    });

    console.log("✅ [Student Delete] Process completed successfully\n");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [Student Delete] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
