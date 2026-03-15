// app/api/schools/[schoolSlug]/students/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import type { GuardianType } from "@/lib/generated/prisma/client";
import { headers } from "next/headers";

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

interface SchoolSettings {
  currentAcademicYearId?: string | null;
  currentTermId?: string | null;
  [key: string]: any;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateUniqueStudentEmail(
  firstName: string,
  lastName: string,
  schoolSubdomain: string,
): Promise<string> {
  const cleanFirst = firstName.trim().toLowerCase().replace(/[^a-z]/g, "");
  const firstInitial = cleanFirst.charAt(0) || "s";
  const cleanLast = lastName.trim().toLowerCase().replace(/[^a-z]/g, "") || "student";
  const baseEmailPrefix = `${firstInitial}.${cleanLast}`;
  
  let currentEmail = `${baseEmailPrefix}@${schoolSubdomain}.sms`;
  let counter = 1;

  while (true) {
    const existingUser = await prisma.user.findUnique({
      where: { email: currentEmail },
    });
    
    if (!existingUser) {
      break;
    }
    
    currentEmail = `${baseEmailPrefix}${counter}@${schoolSubdomain}.sms`;
    counter++;
  }

  return currentEmail;
}

function generateSecurePassword(): string {
  // Generate an 8-character random readable password
  return crypto.randomBytes(4).toString("hex");
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("search");

    const session = await requireSchoolAccess(schoolSlug);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const where: any = {
      schoolId: school.id,
      status: "ACTIVE",
    };

    if (query) {
      where.OR = [
        { profile: { firstName: { contains: query, mode: "insensitive" } } },
        { profile: { lastName: { contains: query, mode: "insensitive" } } },
        { studentId: { contains: query, mode: "insensitive" } },
        { admissionNumber: { contains: query, mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        profile: true,
        class: true,
        bills: {
          where: {
            status: { in: ["PENDING", "PARTIALLY_PAID"] },
          },
          orderBy: { createdAt: "desc" },
          include: {
            academicYear: true,
            term: true,
            items: {
              where: {
                status: { in: ["UNPAID", "PARTIALLY_PAID"] },
              },
            },
          },
        },
      },
      take: 20,
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("[Students] Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}

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
      ...otherData
    } = body;

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        id: true,
        name: true,
        subdomain: true,
        organizationId: true,
        settings: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const { currentAcademicYearId, currentTermId } = (school.settings as unknown as SchoolSettings) || {};

    if (!currentAcademicYearId) {
      return NextResponse.json({ error: "Global Academic Year not set. Please set it in system settings first." }, { status: 400 });
    }

    // ========================================================================
    // STEP 3: Enforce Student Limits
    // ========================================================================
    const subscription = await prisma.subscription.findUnique({
      where: { schoolId: school.id },
      select: { maxStudents: true, planName: true }
    });

    const studentCount = await prisma.student.count({
      where: { schoolId: school.id, status: "ACTIVE" }
    });

    const maxStudents = subscription?.maxStudents || 50; // Default to 50 for Free Plan

    if (studentCount >= maxStudents) {
      return NextResponse.json(
        { 
          error: `Student limit reached for ${subscription?.planName || "Free Plan"}.`,
          details: `Current students: ${studentCount}, Limit: ${maxStudents}. Please upgrade your subscription to add more students.` 
        },
        { status: 403 }
      );
    }

    // ========================================================================
    // STEP 3.5: Generate Student ID and Admission Number if not provided
    // ========================================================================
    let finalStudentId = studentId;
    let finalAdmissionNumber = admissionNumber;

    const schoolPrefix = schoolSlug.toUpperCase();

    if (!finalStudentId || !finalAdmissionNumber) {
      const admDate = new Date(admissionDate);
      const admYear = admDate.getFullYear();
      const admYearShort = admYear.toString().slice(-2);

      const lastStudent = await prisma.student.findFirst({
        where: { 
          schoolId: school.id,
          OR: [
            { studentId: { startsWith: `STU-${admYear}-` } },
            { admissionNumber: { startsWith: `${schoolPrefix}-${admYearShort}-` } }
          ]
        },
        orderBy: { createdAt: "desc" },
        select: { studentId: true, admissionNumber: true },
      });

      let nextStudentNumber = 1;
      let nextAdmissionNumber = 1;

      if (lastStudent) {
        if (lastStudent.studentId.startsWith(`STU-${admYear}-`)) {
          const parts = lastStudent.studentId.split("-");
          const lastNum = parseInt(parts[parts.length - 1]);
          if (!isNaN(lastNum)) nextStudentNumber = lastNum + 1;
        }
        if (lastStudent.admissionNumber?.startsWith(`${schoolPrefix}-${admYearShort}-`)) {
          const parts = lastStudent.admissionNumber.split("-");
          const lastNum = parseInt(parts[parts.length - 1]);
          if (!isNaN(lastNum)) nextAdmissionNumber = lastNum + 1;
        }
      }

      if (!finalStudentId) {
        finalStudentId = `STU-${admYear}-${nextStudentNumber.toString().padStart(4, "0")}`;
      }
      if (!finalAdmissionNumber) {
        finalAdmissionNumber = `${schoolPrefix}-${admYearShort}-${nextAdmissionNumber.toString().padStart(4, "0")}`;
      }

      // Check for collisions
      let collision = await prisma.student.findFirst({
        where: { schoolId: school.id, OR: [{ studentId: finalStudentId }, { admissionNumber: finalAdmissionNumber }] },
      });

      while (collision) {
        if (!studentId) {
          nextStudentNumber++;
          finalStudentId = `STU-${admYear}-${nextStudentNumber.toString().padStart(4, "0")}`;
        }
        if (!admissionNumber) {
          nextAdmissionNumber++;
          finalAdmissionNumber = `${schoolPrefix}-${admYearShort}-${nextAdmissionNumber.toString().padStart(4, "0")}`;
        }
        collision = await prisma.student.findFirst({
          where: { schoolId: school.id, OR: [{ studentId: finalStudentId }, { admissionNumber: finalAdmissionNumber }] },
        });
      }
    }

    // ========================================================================
    // STEP 4: Create student user account
    // ========================================================================
    const studentEmail = await generateUniqueStudentEmail(
      firstName,
      lastName,
      school.subdomain,
    );
    const temporaryPassword = generateSecurePassword();

    // Create user directly via Prisma to bypass auth.api permission checks for school admins
    const newUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `${firstName} ${lastName}`,
        email: studentEmail,
        emailVerified: true,
        role: "user", // The system role is "user", org role is "student"
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const userId = newUser.id;

    // ========================================================================
    // STEP 5: Add student to organization
    // Since we used admin.createUser, we still need to link it to the org.
    // However, for students, we just need them to be in the org.
    // ========================================================================
    await auth.api.addMember({
      body: {
        organizationId: school.organizationId,
        userId: userId,
        role: "student",
      },
    });

    console.log(
      `✅ [Students] Added ${studentEmail} to organization as member`,
    );

    // ========================================================================
    // STEP 6: Get or update UserProfile
    // ✅ FIX: The afterAddMember hook already created a profile, so we UPDATE it
    // ========================================================================

    // Wait a moment for the afterAddMember hook to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    let userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      // Fallback: create if hook didn't run (shouldn't happen)
      console.log("⚠️ [Students] Profile not found, creating...");
      userProfile = await prisma.userProfile.create({
        data: {
          userId: userId,
          firstName,
          lastName,
          otherNames: otherData.otherNames || null,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          nationality: otherData.nationality || "Ghanaian",
          phone: otherData.phone || null,
          alternatePhone: otherData.alternatePhone || null,
          residentialAddress: otherData.residentialAddress || null,
          postalAddress: otherData.postalAddress || null,
          city: otherData.city || null,
          region: otherData.region || null,
          country: otherData.country || "Ghana",
          emergencyContactName: otherData.emergencyContactName || null,
          emergencyContactPhone: otherData.emergencyContactPhone || null,
          emergencyRelationship: otherData.emergencyRelationship || null,
        },
      });
    } else {
      // Update the profile with complete student data
      console.log("📝 [Students] Updating profile with student data...");
      userProfile = await prisma.userProfile.update({
        where: { userId },
        data: {
          firstName,
          lastName,
          otherNames: otherData.otherNames || null,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          nationality: otherData.nationality || "Ghanaian",
          phone: otherData.phone || null,
          alternatePhone: otherData.alternatePhone || null,
          residentialAddress: otherData.residentialAddress || null,
          postalAddress: otherData.postalAddress || null,
          city: otherData.city || null,
          region: otherData.region || null,
          country: otherData.country || "Ghana",
          emergencyContactName: otherData.emergencyContactName || null,
          emergencyContactPhone: otherData.emergencyContactPhone || null,
          emergencyRelationship: otherData.emergencyRelationship || null,
        },
      });
    }

    // ========================================================================
    // STEP 7: Create Student record
    // ========================================================================
    const student = await prisma.student.create({
      data: {
        schoolId,
        profileId: userProfile.id,
        studentId: finalStudentId,
        admissionNumber: finalAdmissionNumber,
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
        plainTextPassword: temporaryPassword,
      },
      include: {
        profile: true,
      },
    });

    console.log(`✅ [Students] Created student record: ${studentId}`);

    // ========================================================================
    // STEP 7.5: Create Enrollment record for the current active term/year
    // ========================================================================
    if (otherData.classId) {
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classId: otherData.classId,
          academicYearId: currentAcademicYearId,
          termId: currentTermId || null,
          status: "ACTIVE",
        }
      });
      console.log(`✅ [Students] Enrolled student in class ${otherData.classId} for year ${currentAcademicYearId}`);
    }

    // ========================================================================
    // STEP 8: Create audit log
    // ========================================================================
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "STUDENT",
        entityId: student.id,
        newValues: {
          studentId: finalStudentId,
          admissionNumber: finalAdmissionNumber,
          name: `${firstName} ${lastName}`,
          email: studentEmail,
          schoolId,
          createdBy: session.user.email,
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
          studentId: finalStudentId,
          admissionNumber: finalAdmissionNumber,
          name: `${firstName} ${lastName}`,
          email: studentEmail,
        },
        credentials: {
          email: studentEmail,
          temporaryPassword,
        },
        message: "Student created successfully.",
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
