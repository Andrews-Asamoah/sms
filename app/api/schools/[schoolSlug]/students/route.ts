// app/api/schools/[schoolSlug]/students/route.ts - CORRECTED
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import type { GuardianType } from "@/lib/generated/prisma/client";
import { headers } from "next/headers"; // ✅ ADD THIS IMPORT

// ============================================================================
// TYPES
// ============================================================================

interface GuardianData {
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  email: string;
  phone: string;
  alternatePhone?: string | null;
  relationshipType: GuardianType;
  occupation?: string | null;
  employer?: string | null;
  workPhone?: string | null;
  workAddress?: string | null;
  isPrimary?: boolean;
  canPickup?: boolean;
  receiveReports?: boolean;
  receiveAlerts?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateStudentEmail(
  firstName: string,
  lastName: string,
  studentId: string,
  schoolSubdomain: string,
): string {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const cleanStudentId = studentId.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${cleanFirst}.${cleanLast}.${cleanStudentId}@${schoolSubdomain}.edu`;
}

function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString("base64").slice(0, 16);
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    // ========================================================================
    // STEP 1: Validate access
    // ========================================================================
    const session = await requireSchoolAccess(schoolSlug);
    const schoolAccess = getSchoolRole(session, schoolSlug);

    if (!schoolAccess) {
      return NextResponse.json(
        { error: "No access to this school" },
        { status: 403 },
      );
    }

    // ========================================================================
    // STEP 2: Parse request body
    // ========================================================================
    const body = await req.json();

    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      studentId,
      admissionNumber,
      admissionDate,
      schoolId,
      guardians = [],
      ...otherData
    } = body;

    // ========================================================================
    // STEP 3: Fetch school with organization
    // ========================================================================
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        organizationId: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // ========================================================================
    // STEP 4: Create student user account
    // ========================================================================
    const studentEmail = generateStudentEmail(
      firstName,
      lastName,
      studentId,
      school.subdomain,
    );

    const temporaryPassword = generateSecurePassword();

    const userResult = await auth.api.signUpEmail({
      body: {
        email: studentEmail,
        password: temporaryPassword,
        name: `${firstName} ${lastName}`,
      },
    });

    if (!userResult) {
      throw new Error("Failed to create user account");
    }

    const userId = userResult.user.id;

    // ========================================================================
    // STEP 5: Add student to organization with "student" role
    // ========================================================================
    await auth.api.addMember({
      body: {
        organizationId: school.organizationId,
        userId: userId,
        role: "student",
      },
    });

    console.log(
      `✅ [Students] Added ${studentEmail} to organization as student`,
    );

    // ========================================================================
    // STEP 6: Create UserProfile
    // ========================================================================
    const userProfile = await prisma.userProfile.create({
      data: {
        userId: userId,
        firstName,
        lastName,
        otherNames: otherData.otherNames || null,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        nationality: otherData.nationality || null,
        phone: otherData.phone || null,
        alternatePhone: otherData.alternatePhone || null,
        residentialAddress: otherData.residentialAddress || null,
        postalAddress: otherData.postalAddress || null,
        city: otherData.city || null,
        region: otherData.region || null,
        country: otherData.country || null,
        emergencyContactName: otherData.emergencyContactName || null,
        emergencyContactPhone: otherData.emergencyContactPhone || null,
        emergencyRelationship: otherData.emergencyRelationship || null,
      },
    });

    // ========================================================================
    // STEP 7: Create Student record
    // ========================================================================
    const student = await prisma.student.create({
      data: {
        schoolId,
        profileId: userProfile.id,
        studentId,
        admissionNumber,
        admissionDate: new Date(admissionDate),
        classId: otherData.classId || null,
        departmentId: otherData.departmentId || null,
        houseId: otherData.houseId || null,
        previousSchool: otherData.previousSchool || null,
        previousClass: otherData.previousClass || null,
        bloodGroup: otherData.bloodGroup || null,
        allergies: otherData.allergies || null,
        medicalConditions: otherData.medicalConditions || null,
        status: "ACTIVE",
      },
      include: {
        profile: true,
      },
    });

    console.log(`✅ [Students] Created student record: ${studentId}`);

    // ========================================================================
    // STEP 8: Process guardians (parents, legal guardians, caretakers)
    // ========================================================================
    const createdGuardians = [];

    for (const guardianData of guardians as GuardianData[]) {
      const existingUser = await prisma.user.findUnique({
        where: { email: guardianData.email },
      });

      let guardian;

      if (existingUser) {
        // ====================================================================
        // Guardian user EXISTS - add to organization if not already member
        // ====================================================================
        console.log(
          `📋 [Students] Guardian ${guardianData.email} already has account`,
        );

        const guardianProfile = await prisma.userProfile.findUnique({
          where: { userId: existingUser.id },
        });

        if (!guardianProfile) {
          throw new Error(
            `User profile not found for guardian ${guardianData.email}`,
          );
        }

        // Find or create Guardian record
        guardian = await prisma.guardian.findFirst({
          where: {
            schoolId,
            email: guardianData.email,
          },
        });

        if (!guardian) {
          guardian = await prisma.guardian.create({
            data: {
              schoolId,
              guardianId: crypto.randomUUID(),
              firstName: guardianData.firstName,
              lastName: guardianData.lastName,
              otherNames: guardianData.otherNames || null,
              email: guardianData.email,
              phone: guardianData.phone,
              alternatePhone: guardianData.alternatePhone || null,
              relationshipType: guardianData.relationshipType,
              occupation: guardianData.occupation || null,
              employer: guardianData.employer || null,
              workPhone: guardianData.workPhone || null,
              workAddress: guardianData.workAddress || null,
              profileId: guardianProfile.id,
              canLogin: true,
            },
          });
        }

        // Check if already a member
        const existingMembership = await prisma.member.findFirst({
          where: {
            userId: existingUser.id,
            organizationId: school.organizationId,
          },
        });

        if (!existingMembership) {
          await auth.api.addMember({
            body: {
              organizationId: school.organizationId,
              userId: existingUser.id,
              role: "guardian",
            },
          });
          console.log(
            `✅ [Students] Added ${guardianData.email} to organization as guardian`,
          );
        }
      } else {
        // ====================================================================
        // NEW guardian - create Guardian record first, THEN send invitation
        // The invitation will be sent via auth.ts sendInvitationEmail
        // which will detect guardian and use guardian email template
        // ====================================================================
        console.log(
          `📧 [Students] Creating guardian and sending invitation: ${guardianData.email}`,
        );

        // Create Guardian record FIRST (without profileId)
        guardian = await prisma.guardian.create({
          data: {
            schoolId,
            guardianId: crypto.randomUUID(),
            firstName: guardianData.firstName,
            lastName: guardianData.lastName,
            otherNames: guardianData.otherNames || null,
            email: guardianData.email,
            phone: guardianData.phone,
            alternatePhone: guardianData.alternatePhone || null,
            relationshipType: guardianData.relationshipType,
            occupation: guardianData.occupation || null,
            employer: guardianData.employer || null,
            workPhone: guardianData.workPhone || null,
            workAddress: guardianData.workAddress || null,
            canLogin: true,
            // profileId will be linked in auth.ts afterAddMember hook
          },
        });

        // Link guardian to student BEFORE sending invitation
        await prisma.guardianStudent.create({
          data: {
            guardianId: guardian.id,
            studentId: student.id,
            isPrimary: guardianData.isPrimary || false,
            canPickup: guardianData.canPickup || true,
            receiveReports: guardianData.receiveReports || true,
            receiveAlerts: guardianData.receiveAlerts || true,
          },
        });

        // NOW send invitation - this will trigger auth.ts sendInvitationEmail
        // which will detect guardian and use guardian email template
        // ✅ FIXED: Added headers parameter
        await auth.api.createInvitation({
          body: {
            email: guardianData.email,
            organizationId: school.organizationId,
            role: "guardian",
          },
          headers: await headers(), // ✅ ADDED THIS
        });

        console.log(
          `✅ [Students] Created guardian record and sent invitation to ${guardianData.email}`,
        );
      }

      // Link guardian to student (if not already done above)
      const existingLink = await prisma.guardianStudent.findUnique({
        where: {
          guardianId_studentId: {
            guardianId: guardian.id,
            studentId: student.id,
          },
        },
      });

      if (!existingLink) {
        await prisma.guardianStudent.create({
          data: {
            guardianId: guardian.id,
            studentId: student.id,
            isPrimary: guardianData.isPrimary || false,
            canPickup: guardianData.canPickup || true,
            receiveReports: guardianData.receiveReports || true,
            receiveAlerts: guardianData.receiveAlerts || true,
          },
        });
      }

      createdGuardians.push({
        id: guardian.id,
        email: guardianData.email,
        name: `${guardianData.firstName} ${guardianData.lastName}`,
        relationshipType: guardianData.relationshipType,
      });
    }

    // ========================================================================
    // STEP 9: Create audit log
    // ========================================================================
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "STUDENT",
        entityId: student.id,
        newValues: {
          studentId: student.studentId,
          admissionNumber: student.admissionNumber,
          name: `${firstName} ${lastName}`,
          email: studentEmail,
          schoolId,
          createdBy: session.user.email,
          guardiansCount: createdGuardians.length,
        },
      },
    });

    // ========================================================================
    // RESPONSE
    // ========================================================================
    return NextResponse.json(
      {
        success: true,
        student: {
          id: student.id,
          studentId: student.studentId,
          admissionNumber: student.admissionNumber,
          name: `${firstName} ${lastName}`,
          email: studentEmail,
        },
        credentials: {
          email: studentEmail,
          temporaryPassword, // Return for admin to share manually
        },
        message: `Student created successfully. Invitation${createdGuardians.length > 1 ? "s" : ""} sent to ${createdGuardians.length} guardian${createdGuardians.length > 1 ? "s" : ""}.`,
        guardians: createdGuardians,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Students] Error creating student:", error);
    return NextResponse.json(
      {
        error: "Failed to create student",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
