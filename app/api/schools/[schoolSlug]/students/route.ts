// app/api/schools/[schoolSlug]/students/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import type { GuardianType } from "@prisma/client";
import {
  resolveSubscriptionLimits,
  wouldExceedLimit,
} from "@/lib/subscription/limits";

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
  [key: string]: unknown;
}

// ============================================================================
// HELPERS
// ============================================================================

async function generateUniqueStudentEmail(
  firstName: string,
  lastName: string,
  schoolSubdomain: string,
  reservedEmails: Set<string> = new Set(),
): Promise<string> {
  const firstInitial =
    firstName
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .charAt(0) || "s";
  const cleanLast =
    lastName
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "") || "student";

  let email = `${firstInitial}.${cleanLast}@${schoolSubdomain}.edu.gh`;
  let counter = 1;

  while (
    reservedEmails.has(email) ||
    (await prisma.user.findUnique({ where: { email } }))
  ) {
    email = `${firstInitial}.${cleanLast}${counter}@${schoolSubdomain}.edu.gh`;
    counter++;
  }

  reservedEmails.add(email);
  return email;
}

function generatePassword(): string {
  return crypto.randomBytes(4).toString("hex");
}

// ============================================================================
// GET — list students
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("search");
    const classIdFilter = searchParams.get("classId");
    const limitParam = searchParams.get("limit");

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

    const where: Record<string, unknown> = {
      schoolId: school.id,
      status: "ACTIVE",
    };

    // Filter by class (used by the manual house-assignment dialog)
    if (classIdFilter) {
      where.classId = classIdFilter;
    }

    if (query) {
      where.OR = [
        { profile: { firstName: { contains: query, mode: "insensitive" } } },
        { profile: { lastName: { contains: query, mode: "insensitive" } } },
        { studentId: { contains: query, mode: "insensitive" } },
        { admissionNumber: { contains: query, mode: "insensitive" } },
      ];
    }

    // When filtering by class we return a lighter payload optimised for the
    // house-assignment dialog (no bills, just profile + house info).
    if (classIdFilter) {
      const takeLimit = Math.min(Number(limitParam) || 200, 300);
      const classStudents = await prisma.student.findMany({
        where,
        select: {
          id: true,
          studentId: true,
          houseId: true,
          profile: { select: { firstName: true, lastName: true } },
        },
        orderBy: { profile: { lastName: "asc" } },
        take: takeLimit,
      });
      return NextResponse.json(classStudents);
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        profile: true,
        class: true,
        bills: {
          where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } },
          orderBy: { createdAt: "desc" },
          include: {
            academicYear: true,
            term: true,
            items: { where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } } },
          },
        },
      },
      take: 20,
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("[Students GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST — create a single student
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  // Track the created Better Auth user ID so we can clean up on partial failure
  let createdUserId: string | null = null;
  let organizationId: string | null = null;

  try {
    const { schoolSlug } = await params;

    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const session = await requireSchoolAccess(schoolSlug);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolAccess = getSchoolRole(session, schoolSlug);
    if (!schoolAccess) {
      return NextResponse.json(
        { error: "No access to this school" },
        { status: 403 },
      );
    }

    // ── 2. Load school ───────────────────────────────────────────────────────
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

    organizationId = school.organizationId;

    // ── 3. Validate academic year + term ─────────────────────────────────────
    const { currentAcademicYearId, currentTermId } =
      (school.settings as unknown as SchoolSettings) ?? {};

    if (!currentAcademicYearId) {
      return NextResponse.json(
        {
          error:
            "Current Academic Year not set. Please configure it in school settings first.",
        },
        { status: 400 },
      );
    }

    if (!currentTermId) {
      return NextResponse.json(
        {
          error:
            "Current Term not set. Please configure it in school settings first.",
        },
        { status: 400 },
      );
    }

    const academicYearId: string = currentAcademicYearId;
    const termId: string = currentTermId;

    // ── 4. Resolve subscription limits ────────────────────────────────────────
    // We fetch limits here. The actual count check happens INSIDE the Prisma
    // transaction below to eliminate race conditions.
    const subscription = await prisma.subscription.findUnique({
      where: { schoolId: school.id },
      select: {
        maxStudents: true,
        maxTeachers: true,
        maxStaff: true,
        planName: true,
        planType: true,
      },
    });
    const limits = resolveSubscriptionLimits(subscription);

    // ── 5. Parse body ────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      studentId: providedStudentId,
      admissionNumber: providedAdmissionNumber,
      admissionDate,
      schoolId: _schoolIdFromBody,
      ...otherData
    } = body;

    // ── 6. Generate student ID & admission number ────────────────────────────
    const { finalStudentId, finalAdmissionNumber } =
      await generateStudentIdentifiers(
        school.id,
        schoolSlug,
        admissionDate,
        providedStudentId,
        providedAdmissionNumber,
      );

    // ── 7. Create Better Auth user (email + password) ────────────────────────
    // These are HTTP calls and CANNOT be run inside a Prisma transaction.
    // We set createdUserId immediately so the catch block can clean up if
    // subsequent Prisma writes fail and leave an orphan auth user.
    const studentEmail = await generateUniqueStudentEmail(
      firstName,
      lastName,
      school.subdomain,
    );
    const temporaryPassword = generatePassword();

    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: studentEmail,
        password: temporaryPassword,
        name: `${firstName} ${lastName}`,
      },
      headers: req.headers,
    });

    if (!signUpResult?.user?.id) {
      throw new Error("Better Auth signUpEmail did not return a user.");
    }

    createdUserId = signUpResult.user.id;

    // ── 8. Add to org as "student" ───────────────────────────────────────────
    await auth.api.addMember({
      body: {
        organizationId: school.organizationId,
        userId: createdUserId,
        role: "student",
      },
      headers: req.headers,
    });

    // ── 9–12. All remaining DB writes in a single atomic transaction ──────────
    //
    // KEY RACE-CONDITION FIX: The student count check is INSIDE the transaction.
    // This means two concurrent requests cannot both read the same count, both
    // pass the limit check, and both insert — only one will commit successfully.
    //
    const student = await prisma.$transaction(async (tx) => {
      // Count inside tx for race-condition safety
      const studentCount = await tx.student.count({
        where: { schoolId: school.id, status: "ACTIVE" },
      });

      if (wouldExceedLimit(studentCount, limits.students)) {
        const limitDisplay =
          limits.students === null ? "unlimited" : String(limits.students);
        // Attach a code so the outer catch can return a clean 403
        const err = new Error(
          `Student limit reached for ${subscription?.planName ?? "Free Plan"}.`,
        ) as Error & { code: string; limitDetails: string };
        err.code = "LIMIT_EXCEEDED";
        err.limitDetails = `${studentCount} / ${limitDisplay} students used. Upgrade your plan to add more.`;
        throw err;
      }

      // Mark email verified (students bypass normal email verification)
      await tx.user.update({
        where: { id: createdUserId! },
        data: { emailVerified: true },
      });

      // Upsert UserProfile
      const profileData = {
        firstName,
        lastName,
        otherNames: otherData.otherNames ?? null,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        nationality: otherData.nationality ?? "Ghanaian",
        phone: otherData.phone ?? null,
        alternatePhone: otherData.alternatePhone ?? null,
        residentialAddress: otherData.residentialAddress ?? null,
        postalAddress: otherData.postalAddress ?? null,
        city: otherData.city ?? null,
        region: otherData.region ?? null,
        country: otherData.country ?? "Ghana",
        emergencyContactName: otherData.emergencyContactName ?? null,
        emergencyContactPhone: otherData.emergencyContactPhone ?? null,
        emergencyRelationship: otherData.emergencyRelationship ?? null,
      };

      const userProfile = await tx.userProfile.upsert({
        where: { userId: createdUserId! },
        update: profileData,
        create: { userId: createdUserId!, ...profileData },
      });

      // Resolve departmentId from class if not explicitly provided
      let finalDepartmentId = otherData.departmentId ?? null;
      if (otherData.classId && !finalDepartmentId) {
        const selectedClass = await tx.class.findUnique({
          where: { id: otherData.classId },
          select: { departmentId: true },
        });
        if (selectedClass?.departmentId) {
          finalDepartmentId = selectedClass.departmentId;
        }
      }

      // Auto-assign house at school level (balanced: fewest students per house).
      // Industry standard — houses are school-wide social units, not per-class.
      // Only assigned when the student has a class; skipped otherwise.
      let finalHouseId: string | null = otherData.houseId ?? null;
      if (otherData.classId && !finalHouseId) {
        const activeHouses = await tx.house.findMany({
          where: { schoolId: school.id, isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        if (activeHouses.length > 0) {
          // Count students per house school-wide
          const houseCounts = await tx.student.groupBy({
            by: ["houseId"],
            where: {
              schoolId: school.id,
              houseId: { in: activeHouses.map((h) => h.id) },
              status: "ACTIVE",
            },
            _count: { houseId: true },
          });

          const countMap = new Map<string, number>(
            houseCounts.map((c) => [c.houseId!, c._count.houseId])
          );

          // Pick the house with the smallest count (ties broken by creation order)
          const sorted = [...activeHouses].sort(
            (a, b) => (countMap.get(a.id) ?? 0) - (countMap.get(b.id) ?? 0),
          );
          finalHouseId = sorted[0].id;
        }
      }

      // Create Student record
      const newStudent = await tx.student.create({
        data: {
          schoolId: school.id,
          profileId: userProfile.id,
          studentId: finalStudentId,
          admissionNumber: finalAdmissionNumber,
          admissionDate: new Date(admissionDate),
          classId: otherData.classId ?? null,
          departmentId: finalDepartmentId,
          houseId: finalHouseId,
          previousSchool: otherData.previousSchool ?? null,
          previousClass: otherData.previousClass ?? null,
          bloodGroup: otherData.bloodGroup ?? null,
          allergies: otherData.allergies ?? null,
          medicalConditions: otherData.medicalConditions ?? null,
          status: "ACTIVE",
          plainTextPassword: temporaryPassword,
        },
        include: { profile: true },
      });

      // Enroll in current class / year / term
      if (otherData.classId) {
        await tx.enrollment.create({
          data: {
            studentId: newStudent.id,
            classId: otherData.classId,
            academicYearId,
            termId,
            status: "ACTIVE",
          },
        });
      }

      // Audit log with schoolId for per-school filtering
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          schoolId: school.id,
          action: "CREATE",
          entityType: "STUDENT",
          entityId: newStudent.id,
          newValues: {
            studentId: finalStudentId,
            admissionNumber: finalAdmissionNumber,
            name: `${firstName} ${lastName}`,
            email: studentEmail,
            schoolId: school.id,
            createdBy: session.user.email,
          },
        },
      });

      return newStudent;
    });

    return NextResponse.json(
      {
        success: true,
        student: {
          id: student.id,
          userId: createdUserId,
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
    // ── Orphan cleanup ───────────────────────────────────────────────────────
    // If the Prisma transaction failed AFTER the Better Auth user was created,
    // we must delete the orphaned user and member records to keep the DB clean.
    if (createdUserId) {
      try {
        if (organizationId) {
          await prisma.member.deleteMany({
            where: { userId: createdUserId, organizationId },
          });
        }
        await prisma.user.delete({ where: { id: createdUserId } });
      } catch (cleanupErr) {
        console.error("[Students POST] Orphan user cleanup failed:", cleanupErr);
      }
    }

    // Surface plan limit errors as 403 instead of 500
    if (
      error instanceof Error &&
      (error as Error & { code?: string }).code === "LIMIT_EXCEEDED"
    ) {
      return NextResponse.json(
        {
          error: error.message,
          details: (error as Error & { limitDetails?: string }).limitDetails,
        },
        { status: 403 },
      );
    }

    console.error("[Students POST] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create student",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// SHARED UTILITY — generate & deduplicate student identifiers
// ============================================================================

export async function generateStudentIdentifiers(
  schoolId: string,
  schoolSlug: string,
  admissionDate: string,
  providedStudentId?: string,
  providedAdmissionNumber?: string,
): Promise<{ finalStudentId: string; finalAdmissionNumber: string }> {
  const schoolPrefix = schoolSlug.toUpperCase();
  const admDate = new Date(admissionDate);
  const admYear = admDate.getFullYear();
  const yy = admYear.toString().slice(-2); // e.g. "26"

  const stuPrefix = `${schoolPrefix}-${yy}-`;
  const admPrefix = yy;

  // Find the highest-sequence student already registered for this year
  const lastStudent = await prisma.student.findFirst({
    where: {
      schoolId,
      OR: [
        { studentId: { startsWith: stuPrefix } },
        { admissionNumber: { startsWith: admPrefix } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { studentId: true, admissionNumber: true },
  });

  let nextStudentSeq = 1;
  let nextAdmissionSeq = 1;

  if (lastStudent) {
    if (lastStudent.studentId?.startsWith(stuPrefix)) {
      const sn = parseInt(lastStudent.studentId.slice(stuPrefix.length));
      if (!isNaN(sn)) nextStudentSeq = sn + 1;
    }

    if (lastStudent.admissionNumber?.startsWith(admPrefix)) {
      const an = parseInt(lastStudent.admissionNumber.slice(admPrefix.length));
      if (!isNaN(an)) nextAdmissionSeq = an + 1;
    }
  }

  let finalStudentId =
    providedStudentId ??
    `${stuPrefix}${nextStudentSeq.toString().padStart(4, "0")}`;
  let finalAdmissionNumber =
    providedAdmissionNumber ??
    `${admPrefix}${nextAdmissionSeq.toString().padStart(4, "0")}`;

  // Collision detection with retry — the unique DB constraint is the true
  // race-condition guard. This loop handles the rare case where two concurrent
  // requests read the same "last student" and generate the same ID.
  let attempts = 0;
  while (true) {
    const collision = await prisma.student.findFirst({
      where: {
        schoolId,
        OR: [
          { studentId: finalStudentId },
          { admissionNumber: finalAdmissionNumber },
        ],
      },
      select: { id: true },
    });

    if (!collision) break;

    if (providedStudentId && providedAdmissionNumber) {
      throw new Error(
        `Student ID "${finalStudentId}" or Admission Number "${finalAdmissionNumber}" already exists.`,
      );
    }

    attempts++;
    if (attempts > 20) {
      throw new Error("Could not generate a unique student ID after 20 attempts.");
    }

    if (!providedStudentId) {
      nextStudentSeq++;
      finalStudentId = `${stuPrefix}${nextStudentSeq.toString().padStart(4, "0")}`;
    }
    if (!providedAdmissionNumber) {
      nextAdmissionSeq++;
      finalAdmissionNumber = `${admPrefix}${nextAdmissionSeq.toString().padStart(4, "0")}`;
    }
  }

  return { finalStudentId, finalAdmissionNumber };
}
