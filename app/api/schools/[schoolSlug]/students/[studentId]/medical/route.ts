// app/api/schools/[schoolSlug]/students/[studentId]/medical/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { Prisma } from "@prisma/client";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const updateMedicalSchema = z.object({
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""])
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  allergies: z.string().nullable().optional(),
  medicalConditions: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  emergencyRelationship: z.string().nullable().optional(),
});

// ============================================================================
// PATCH — update student medical records
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> }
) {
  try {
    const { schoolSlug, studentId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role && !session.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Determine authorization
    const isAdmin =
      role?.effectiveRole === "admin" ||
      role?.effectiveRole === "owner" ||
      session.isSuperAdmin;

    let isAuthorized = isAdmin;

    if (!isAuthorized && role?.effectiveRole === "guardian") {
      // Find the guardian profile associated with this user
      const guardian = await prisma.guardian.findFirst({
        where: {
          schoolId: school.id,
          profile: { userId: session.user.id },
        },
        select: { id: true },
      });

      if (guardian) {
        // Verify link to the student
        const link = await prisma.guardianStudent.findFirst({
          where: {
            guardianId: guardian.id,
            studentId: studentId,
          },
        });
        if (link) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized to update this student's records" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateMedicalSchema.parse(body);

    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId, schoolId: school.id },
      include: { profile: true },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // ── Update database in transaction ─────────────────────────────────────────
    const updatedStudent = await prisma.$transaction(async (tx) => {
      // 1. Update Student model fields
      const studentPatch: Partial<{
        bloodGroup: string | null;
        allergies: string | null;
        medicalConditions: string | null;
      }> = {};

      if (validatedData.bloodGroup !== undefined) studentPatch.bloodGroup = validatedData.bloodGroup;
      if (validatedData.allergies !== undefined) studentPatch.allergies = validatedData.allergies;
      if (validatedData.medicalConditions !== undefined) studentPatch.medicalConditions = validatedData.medicalConditions;

      if (Object.keys(studentPatch).length > 0) {
        await tx.student.update({
          where: { id: studentId },
          data: studentPatch,
        });
      }

      // 2. Update UserProfile model fields
      const profilePatch: Partial<{
        emergencyContactName: string | null;
        emergencyContactPhone: string | null;
        emergencyRelationship: string | null;
      }> = {};

      if (validatedData.emergencyContactName !== undefined) profilePatch.emergencyContactName = validatedData.emergencyContactName;
      if (validatedData.emergencyContactPhone !== undefined) profilePatch.emergencyContactPhone = validatedData.emergencyContactPhone;
      if (validatedData.emergencyRelationship !== undefined) profilePatch.emergencyRelationship = validatedData.emergencyRelationship;

      if (Object.keys(profilePatch).length > 0) {
        await tx.userProfile.update({
          where: { id: existingStudent.profileId },
          data: profilePatch,
        });
      }

      // Fetch the final student record with profile for audit logging and response
      return tx.student.findUnique({
        where: { id: studentId },
        include: {
          profile: true,
          class: true,
        },
      });
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Student",
        entityId: studentId,
        oldValues: {
          bloodGroup: existingStudent.bloodGroup,
          allergies: existingStudent.allergies,
          medicalConditions: existingStudent.medicalConditions,
          emergencyContactName: existingStudent.profile.emergencyContactName,
          emergencyContactPhone: existingStudent.profile.emergencyContactPhone,
          emergencyRelationship: existingStudent.profile.emergencyRelationship,
        } as Prisma.InputJsonValue,
        newValues: {
          bloodGroup: updatedStudent?.bloodGroup,
          allergies: updatedStudent?.allergies,
          medicalConditions: updatedStudent?.medicalConditions,
          emergencyContactName: updatedStudent?.profile.emergencyContactName,
          emergencyContactPhone: updatedStudent?.profile.emergencyContactPhone,
          emergencyRelationship: updatedStudent?.profile.emergencyRelationship,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error) {
    console.error("[Student Medical PATCH] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
