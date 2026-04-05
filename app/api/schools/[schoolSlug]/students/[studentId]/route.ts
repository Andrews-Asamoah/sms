// app/api/schools/[schoolSlug]/students/[studentId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { Prisma } from "@/lib/generated/prisma/client";

// ============================================================================
// SCHEMA
// ============================================================================

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

// ============================================================================
// GET — fetch a single student
// ============================================================================

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
      where: { id: studentId, schoolId: school.id },
      include: {
        profile: true,
        class: { include: { academicYear: true } },
        department: true,
        house: true,
        guardians: {
          include: {
            guardian: { include: { profile: true } },
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
    console.error("[Student GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH — update a student
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  try {
    const { schoolSlug, studentId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateStudentSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId, schoolId: school.id },
      include: { profile: true },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check admission number uniqueness if being changed.
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
        return NextResponse.json(
          { error: "Admission number already exists" },
          { status: 400 },
        );
      }
    }

    // ── Update in a transaction ──────────────────────────────────────────────
    const updatedStudent = await prisma.$transaction(async (tx) => {
      // Build profile patch — only include fields that were actually sent.
      type ProfilePatch = Partial<{
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
      }>;

      const profilePatch: ProfilePatch = {};

      if (validatedData.firstName)
        profilePatch.firstName = validatedData.firstName;
      if (validatedData.lastName)
        profilePatch.lastName = validatedData.lastName;
      if (validatedData.otherNames !== undefined)
        profilePatch.otherNames = validatedData.otherNames;
      if (validatedData.gender) profilePatch.gender = validatedData.gender;
      if (validatedData.dateOfBirth)
        profilePatch.dateOfBirth = new Date(validatedData.dateOfBirth);
      if (validatedData.nationality)
        profilePatch.nationality = validatedData.nationality;
      if (validatedData.phone !== undefined)
        profilePatch.phone = validatedData.phone;
      if (validatedData.alternatePhone !== undefined)
        profilePatch.alternatePhone = validatedData.alternatePhone;
      if (validatedData.residentialAddress !== undefined)
        profilePatch.residentialAddress = validatedData.residentialAddress;
      if (validatedData.postalAddress !== undefined)
        profilePatch.postalAddress = validatedData.postalAddress;
      if (validatedData.city !== undefined)
        profilePatch.city = validatedData.city;
      if (validatedData.region !== undefined)
        profilePatch.region = validatedData.region;
      if (validatedData.country) profilePatch.country = validatedData.country;
      if (validatedData.emergencyContactName !== undefined)
        profilePatch.emergencyContactName = validatedData.emergencyContactName;
      if (validatedData.emergencyContactPhone !== undefined)
        profilePatch.emergencyContactPhone =
          validatedData.emergencyContactPhone;
      if (validatedData.emergencyRelationship !== undefined)
        profilePatch.emergencyRelationship =
          validatedData.emergencyRelationship;

      if (Object.keys(profilePatch).length > 0) {
        await tx.userProfile.update({
          where: { id: existingStudent.profileId },
          data: profilePatch,
        });
      }

      // Build student patch.
      type StudentPatch = Partial<{
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
      }>;

      const studentPatch: StudentPatch = {};

      if (validatedData.admissionNumber !== undefined)
        studentPatch.admissionNumber = validatedData.admissionNumber;
      if (validatedData.admissionDate)
        studentPatch.admissionDate = new Date(validatedData.admissionDate);
      
      if (validatedData.classId !== undefined) {
        studentPatch.classId = validatedData.classId;
        
        // Auto-assign department based on new class, unless department is explicitly overridden
        if (validatedData.classId && validatedData.departmentId === undefined) {
          const cls = await tx.class.findUnique({
            where: { id: validatedData.classId },
            select: { departmentId: true }
          });
          if (cls?.departmentId) {
            studentPatch.departmentId = cls.departmentId;
          }
        }
      }

      if (validatedData.departmentId !== undefined)
        studentPatch.departmentId = validatedData.departmentId;
      if (validatedData.houseId !== undefined)
        studentPatch.houseId = validatedData.houseId;
      if (validatedData.previousSchool !== undefined)
        studentPatch.previousSchool = validatedData.previousSchool;
      if (validatedData.previousClass !== undefined)
        studentPatch.previousClass = validatedData.previousClass;
      if (validatedData.bloodGroup !== undefined)
        studentPatch.bloodGroup = validatedData.bloodGroup;
      if (validatedData.allergies !== undefined)
        studentPatch.allergies = validatedData.allergies;
      if (validatedData.medicalConditions !== undefined)
        studentPatch.medicalConditions = validatedData.medicalConditions;
      if (validatedData.status) studentPatch.status = validatedData.status;

      return tx.student.update({
        where: { id: studentId },
        data: studentPatch,
        include: {
          profile: true,
          class: { include: { academicYear: true } },
          department: true,
          house: true,
        },
      });
    });

    // Audit log — outside the transaction so a log failure doesn't roll back
    // the update.
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

    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error("[Student PATCH] Error:", error);

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

// ============================================================================
// DELETE — remove a student
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  try {
    const { schoolSlug, studentId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId, schoolId: school.id },
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
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Guard against deleting students with existing financial or academic records.
    if (
      student._count.bills > 0 ||
      student._count.enrollments > 0 ||
      student._count.assessmentScores > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a student with existing records. Consider marking them as withdrawn instead.",
        },
        { status: 400 },
      );
    }

    await prisma.student.delete({ where: { id: studentId } });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Student",
        entityId: studentId,
        oldValues: student as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Student DELETE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
