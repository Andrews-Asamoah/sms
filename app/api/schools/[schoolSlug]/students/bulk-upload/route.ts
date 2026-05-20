// app/api/schools/[schoolSlug]/students/bulk-upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { Gender, StudentStatus, EnrollmentStatus } from "@prisma/client";
import {
  resolveSubscriptionLimits,
  wouldExceedLimit,
} from "@/lib/subscription/limits";

// ============================================================================
// TYPES
// ============================================================================

interface StudentRow {
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  gender: Gender;
  dateOfBirth: string;
  nationality?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  residentialAddress?: string | null;
  postalAddress?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  admissionDate: string;
  className?: string | null;
  departmentName?: string | null;
  houseName?: string | null;
  previousSchool?: string | null;
  previousClass?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyRelationship?: string | null;
}

interface ProcessResult {
  row: number;
  studentId: string;
  admissionNumber: string;
  name: string;
  email: string;
  password?: string;
  status: "success" | "error";
  message?: string;
  action?: "created" | "updated" | "skipped";
}

interface SchoolSettings {
  currentAcademicYearId?: string | null;
  currentTermId?: string | null;
  [key: string]: unknown;
}

interface PreparedRow {
  index: number;
  row: StudentRow;
  studentId: string;
  admissionNumber: string;
  studentEmail: string;
  temporaryPassword: string;
  classId: string | null;
  departmentId: string | null;
  houseId: string | null;
  valid: boolean;
  validationError?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateUniqueStudentEmail(
  firstName: string,
  lastName: string,
  schoolSubdomain: string,
  reservedEmails: Set<string>,
  existingEmails: Set<string>,
): string {
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

  while (reservedEmails.has(email) || existingEmails.has(email)) {
    email = `${firstInitial}.${cleanLast}${counter}@${schoolSubdomain}.edu.gh`;
    counter++;
  }

  reservedEmails.add(email);
  return email;
}

// ============================================================================
// EXCEL PARSING
// ============================================================================

function parseExcelFile(buffer: Buffer): StudentRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false }) as Record<
    string,
    unknown
  >[];

  const getVal = (row: Record<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined) return row[key];
      const needle = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const found = Object.keys(row).find(
        (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === needle,
      );
      if (found) return row[found];
    }
    return undefined;
  };

  return rows.map((row) => ({
    firstName: String(
      getVal(row, "First Name*", "First Name", "FirstName") ?? "",
    ).trim(),
    lastName: String(
      getVal(row, "Last Name*", "Last Name", "LastName") ?? "",
    ).trim(),
    otherNames: getVal(row, "Other Names")
      ? String(getVal(row, "Other Names")).trim()
      : null,
    gender: String(
      getVal(row, "Gender*", "Gender") ?? "",
    ).toUpperCase() as Gender,
    dateOfBirth: String(
      getVal(row, "Date of Birth*", "Date of Birth", "DOB") ?? "",
    ),
    nationality: getVal(row, "Nationality")
      ? String(getVal(row, "Nationality")).trim()
      : null,
    phone: getVal(row, "Phone") ? String(getVal(row, "Phone")).trim() : null,
    alternatePhone: getVal(row, "Alternate Phone")
      ? String(getVal(row, "Alternate Phone")).trim()
      : null,
    residentialAddress: getVal(row, "Residential Address")
      ? String(getVal(row, "Residential Address")).trim()
      : null,
    postalAddress: getVal(row, "Postal Address")
      ? String(getVal(row, "Postal Address")).trim()
      : null,
    city: getVal(row, "City") ? String(getVal(row, "City")).trim() : null,
    region: getVal(row, "Region") ? String(getVal(row, "Region")).trim() : null,
    country: getVal(row, "Country")
      ? String(getVal(row, "Country")).trim()
      : null,
    admissionDate: String(
      getVal(row, "Admission Date*", "Admission Date") ?? "",
    ),
    className: getVal(row, "Class Name", "Class")
      ? String(getVal(row, "Class Name", "Class")).trim()
      : null,
    departmentName: getVal(row, "Department Name", "Department")
      ? String(getVal(row, "Department Name", "Department")).trim()
      : null,
    houseName: getVal(row, "House Name", "House")
      ? String(getVal(row, "House Name", "House")).trim()
      : null,
    previousSchool: getVal(row, "Previous School")
      ? String(getVal(row, "Previous School")).trim()
      : null,
    previousClass: getVal(row, "Previous Class")
      ? String(getVal(row, "Previous Class")).trim()
      : null,
    bloodGroup: getVal(row, "Blood Group")
      ? String(getVal(row, "Blood Group")).trim()
      : null,
    allergies: getVal(row, "Allergies")
      ? String(getVal(row, "Allergies")).trim()
      : null,
    medicalConditions: getVal(row, "Medical Conditions")
      ? String(getVal(row, "Medical Conditions")).trim()
      : null,
    emergencyContactName: getVal(row, "Emergency Contact Name")
      ? String(getVal(row, "Emergency Contact Name")).trim()
      : null,
    emergencyContactPhone: getVal(row, "Emergency Contact Phone")
      ? String(getVal(row, "Emergency Contact Phone")).trim()
      : null,
    emergencyRelationship: getVal(row, "Emergency Relationship")
      ? String(getVal(row, "Emergency Relationship")).trim()
      : null,
  }));
}

// ============================================================================
// POST — bulk upload
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const session = await requireSchoolAccess(schoolSlug);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolAccess = getSchoolRole(session, schoolSlug);
    if (
      !schoolAccess ||
      !["admin", "owner"].includes(schoolAccess.effectiveRole)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // ── 2. Parse input ───────────────────────────────────────────────────────
    //
    // Two supported formats:
    //   a) multipart/form-data with a "file" field — server parses Excel.
    //      Preferred: keeps xlsx out of the client bundle and ensures all rows
    //      arrive in one request so Phase A ID reservation is never split.
    //   b) application/json with a "students" array — kept for API consumers.
    //
    let studentRows: StudentRow[] = [];
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      studentRows = body.students ?? [];
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }
      studentRows = parseExcelFile(Buffer.from(await file.arrayBuffer()));
    }

    if (studentRows.length === 0) {
      return NextResponse.json(
        { error: "No student data found in the uploaded file." },
        { status: 400 },
      );
    }

    // ── 3. Load school ───────────────────────────────────────────────────────
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      include: {
        classes: { select: { id: true, name: true, departmentId: true } },
        departments: { select: { id: true, name: true } },
        houses: { select: { id: true, name: true } },
        subscription: {
          select: {
            maxStudents: true,
            maxTeachers: true,
            maxStaff: true,
            planName: true,
            planType: true,
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // ── 4. Validate academic year + term ─────────────────────────────────────
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

    // ── 5. Enforce student limit ──────────────────────────────────────────────
    //
    // resolveSubscriptionLimits() is the single source of truth:
    //   - null in DB  → unlimited (premium plan) — wouldExceedLimit returns false
    //   - number      → hard cap
    //   - no subscription row → free plan defaults (50)
    //
    // When the limit is not null, we load existing students once and reuse
    // that same list for both the count and the deduplication key set,
    // avoiding a separate COUNT query.
    //
    const limits = resolveSubscriptionLimits(school.subscription);

    if (limits.students !== null) {
      // Load existing active students — only the three fields needed for
      // deduplication. Reuse the array length as the count to avoid a
      // separate COUNT(*) round-trip.
      const existingStudents = await prisma.student.findMany({
        where: { schoolId: school.id, status: "ACTIVE" },
        select: {
          profile: {
            select: { firstName: true, lastName: true, dateOfBirth: true },
          },
        },
      });

      const currentCount = existingStudents.length;

      // Build a deduplication key set from the existing students so that
      // re-uploading the same sheet doesn't count already-existing students
      // as "new" and block the upload unnecessarily.
      const existingKeys = new Set(
        existingStudents.map((s) => {
          try {
            return `${s.profile.firstName.toLowerCase()}_${s.profile.lastName.toLowerCase()}_${new Date(s.profile.dateOfBirth).toISOString().split("T")[0]}`;
          } catch {
            return "";
          }
        }),
      );

      let newCount = 0;
      for (const row of studentRows) {
        if (!row.firstName || !row.lastName || !row.dateOfBirth) {
          // Row is missing required fields — it will fail validation in
          // Phase A, but count it as "new" to be conservative.
          newCount++;
          continue;
        }
        try {
          const key = `${row.firstName.toLowerCase()}_${row.lastName.toLowerCase()}_${new Date(row.dateOfBirth).toISOString().split("T")[0]}`;
          if (!existingKeys.has(key)) newCount++;
        } catch {
          newCount++;
        }
      }

      if (wouldExceedLimit(currentCount, limits.students, newCount)) {
        const remaining = Math.max(0, limits.students - currentCount);
        return NextResponse.json(
          {
            error: `Student limit exceeded for ${school.subscription?.planName ?? "Free Plan"}.`,
            details: `${currentCount} existing + ${newCount} new > ${limits.students} limit. Only ${remaining} slot(s) available. Upgrade to add more students.`,
          },
          { status: 403 },
        );
      }
    }
    // When limits.students is null (unlimited), skip the check entirely —
    // no DB query needed.

    // ── 6. Phase A — sequential validation and reservation of IDs/emails ─────
    //
    // All ID generation and email reservation happens sequentially before any
    // DB writes. This guarantees the parallel Phase B never produces duplicate
    // IDs or emails within the same upload batch.
    // Also, we strictly enforce valid class names to prevent classless orphans.

    // Preload active students to perform duplicate checks and count slot limits.
    const activeStudents = await prisma.student.findMany({
      where: { schoolId: school.id },
      select: {
        id: true,
        studentId: true,
        admissionNumber: true,
        classId: true,
        departmentId: true,
        houseId: true,
        previousSchool: true,
        previousClass: true,
        bloodGroup: true,
        allergies: true,
        medicalConditions: true,
        status: true,
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            userId: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                accounts: { select: { id: true } }
              }
            }
          }
        }
      }
    });

    const studentMap = new Map<string, typeof activeStudents[0]>();
    for (const s of activeStudents) {
      if (s.profile?.firstName && s.profile?.lastName && s.profile?.dateOfBirth) {
        try {
          const key = `${s.profile.firstName.trim().toLowerCase()}_${s.profile.lastName.trim().toLowerCase()}_${new Date(s.profile.dateOfBirth).toISOString().split("T")[0]}`;
          studentMap.set(key, s);
        } catch {
          // Ignore invalid dates in database
        }
      }
    }

    // Enforce limits checks (if not unlimited)
    if (limits.students !== null) {
      const currentCount = activeStudents.filter(s => s.status === "ACTIVE").length;

      let newCount = 0;
      for (const row of studentRows) {
        if (!row.firstName || !row.lastName || !row.dateOfBirth) {
          newCount++;
          continue;
        }
        try {
          const key = `${row.firstName.trim().toLowerCase()}_${row.lastName.trim().toLowerCase()}_${new Date(row.dateOfBirth).toISOString().split("T")[0]}`;
          if (!studentMap.has(key)) newCount++;
        } catch {
          newCount++;
        }
      }

      if (wouldExceedLimit(currentCount, limits.students, newCount)) {
        const remaining = Math.max(0, limits.students - currentCount);
        return NextResponse.json(
          {
            error: `Student limit exceeded for ${school.subscription?.planName ?? "Free Plan"}.`,
            details: `${currentCount} existing + ${newCount} new > ${limits.students} limit. Only ${remaining} slot(s) available. Upgrade to add more students.`,
          },
          { status: 403 },
        );
      }
    }

    // Preload organization members
    const allMembers = await prisma.member.findMany({
      where: { organizationId: school.organizationId },
      select: { userId: true }
    });
    const memberUserIds = new Set(allMembers.map(m => m.userId));

    // Preload current academic year/term enrollments
    const currentEnrollments = await prisma.enrollment.findMany({
      where: {
        academicYearId,
        termId,
        class: { schoolId: school.id }
      },
      select: { studentId: true, classId: true }
    });
    const enrollmentKeys = new Set(currentEnrollments.map(e => `${e.studentId}_${e.classId}`));

    // Optimization: Bulk fetch existing emails to avoid sequential DB checks.
    const existingUsers = await prisma.user.findMany({
      where: {
        email: { endsWith: `@${school.subdomain}.edu.gh` },
      },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.email));

    const reservedEmails = new Set<string>();
    const yearSequences = new Map<
      number,
      { studentSeq: number; admissionSeq: number }
    >();

    const prepared: PreparedRow[] = [];

    for (let i = 0; i < studentRows.length; i++) {
      const row = studentRows[i];

      const missing: string[] = [];
      if (!row.firstName) missing.push("First Name");
      if (!row.lastName) missing.push("Last Name");
      if (!row.gender) missing.push("Gender");
      if (!row.dateOfBirth) missing.push("Date of Birth");
      if (!row.admissionDate) missing.push("Admission Date");
      if (!row.className) missing.push("Class Name");

      if (missing.length > 0) {
        prepared.push({
          index: i,
          row,
          studentId: "",
          admissionNumber: "",
          studentEmail: "",
          temporaryPassword: "",
          classId: null,
          departmentId: null,
          houseId: null,
          valid: false,
          validationError: `Missing required fields: ${missing.join(", ")}`,
        });
        continue;
      }

      const classRecord = school.classes.find(
        (c) => c.name.toLowerCase() === row.className!.trim().toLowerCase()
      );
      if (!classRecord) {
        prepared.push({
          index: i,
          row,
          studentId: "",
          admissionNumber: "",
          studentEmail: "",
          temporaryPassword: "",
          classId: null,
          departmentId: null,
          houseId: null,
          valid: false,
          validationError: `Class "${row.className}" not found. Please create this class first.`,
        });
        continue;
      }

      const admDate = new Date(row.admissionDate);
      if (isNaN(admDate.getTime())) {
        prepared.push({
          index: i,
          row,
          studentId: "",
          admissionNumber: "",
          studentEmail: "",
          temporaryPassword: "",
          classId: null,
          departmentId: null,
          houseId: null,
          valid: false,
          validationError: `Invalid Admission Date: "${row.admissionDate}"`,
        });
        continue;
      }

      const admYear = admDate.getFullYear();
      const yy = admYear.toString().slice(-2);
      const schoolPrefix = schoolSlug.toUpperCase();
      const stuPrefix = `${schoolPrefix}-${yy}-`;
      const admPrefix = yy;

      if (!yearSequences.has(admYear)) {
        const existing = await prisma.student.findMany({
          where: {
            schoolId: school.id,
            OR: [
              { studentId: { startsWith: stuPrefix } },
              { admissionNumber: { startsWith: admPrefix } },
            ],
          },
          select: { studentId: true, admissionNumber: true },
        });

        let sSeq = 1;
        let aSeq = 1;
        for (const s of existing) {
          if (s.studentId?.startsWith(stuPrefix)) {
            const sn = parseInt(s.studentId.slice(stuPrefix.length));
            if (!isNaN(sn) && sn >= sSeq) sSeq = sn + 1;
          }

          if (s.admissionNumber?.startsWith(admPrefix)) {
            const an = parseInt(s.admissionNumber.slice(admPrefix.length));
            if (!isNaN(an) && an >= aSeq) aSeq = an + 1;
          }
        }
        yearSequences.set(admYear, { studentSeq: sSeq, admissionSeq: aSeq });
      }

      const seqs = yearSequences.get(admYear)!;
      const studentId = `${stuPrefix}${seqs.studentSeq.toString().padStart(4, "0")}`;
      const admissionNumber = `${admPrefix}${seqs.admissionSeq.toString().padStart(4, "0")}`;
      seqs.studentSeq++;
      seqs.admissionSeq++;

      const studentEmail = generateUniqueStudentEmail(
        row.firstName,
        row.lastName,
        school.subdomain,
        reservedEmails,
        existingEmails,
      );

      let departmentId = row.departmentName
        ? (school.departments.find((d) => d.name === row.departmentName)?.id ??
          null)
        : null;

      if (classRecord.departmentId && !departmentId) {
        departmentId = classRecord.departmentId;
      }

      const house = row.houseName
        ? (school.houses.find((h) => h.name === row.houseName) ?? null)
        : null;

      prepared.push({
        index: i,
        row,
        studentId,
        admissionNumber,
        studentEmail,
        temporaryPassword: crypto.randomBytes(4).toString("hex"),
        classId: classRecord.id,
        departmentId: departmentId,
        houseId: house?.id ?? null,
        valid: true,
      });
    }

    // ── 7. Phase B — Parallel processing in larger batches ───────────────────
    const BATCH_SIZE = 15;
    const results: ProcessResult[] = [];

    // Memory accumulators for downstream bulk writes
    const profilesToCreate: any[] = [];
    const studentsToCreate: any[] = [];
    const membersToCreate: any[] = [];
    const enrollmentsToCreate: any[] = [];
    const repairUpdates: Array<{ id: string; passwordUpdate: string; memberToCreate?: any }> = [];

    for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
      const batch = prepared.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (p): Promise<ProcessResult> => {
          const rowNumber = p.index + 2;
          const { row } = p;

          if (!p.valid) {
            return {
              row: rowNumber,
              studentId: "",
              admissionNumber: "",
              name:
                row.firstName && row.lastName
                  ? `${row.firstName} ${row.lastName}`
                  : "Unknown",
              email: "",
              status: "error",
              message: p.validationError ?? "Invalid row data",
            };
          }

          try {
            // Check duplicate in-memory map
            const key = `${row.firstName.trim().toLowerCase()}_${row.lastName.trim().toLowerCase()}_${new Date(row.dateOfBirth).toISOString().split("T")[0]}`;
            const existingStudent = studentMap.get(key);

            if (existingStudent) {
              const existingUser = existingStudent.profile?.user;

              if (existingUser && existingUser.accounts.length === 0) {
                // Repair: user exists but missing account row. Create it atomically.
                await auth.api.signUpEmail({
                  body: {
                    email: existingUser.email,
                    password: p.temporaryPassword,
                    name: existingUser.name,
                  },
                  headers: req.headers,
                });

                // Schedule password text save
                repairUpdates.push({
                  id: existingStudent.id,
                  passwordUpdate: p.temporaryPassword,
                  memberToCreate: memberUserIds.has(existingUser.id)
                    ? undefined
                    : {
                        id: crypto.randomUUID(),
                        organizationId: school.organizationId,
                        userId: existingUser.id,
                        role: "student",
                        banned: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                });

                return {
                  row: rowNumber,
                  studentId: existingStudent.studentId,
                  admissionNumber:
                    existingStudent.admissionNumber ?? p.admissionNumber,
                  name: `${row.firstName} ${row.lastName}`,
                  email: existingUser.email,
                  password: p.temporaryPassword,
                  status: "success",
                  action: "updated",
                  message:
                    "Login account repaired — new temporary password issued.",
                };
              }

              return {
                row: rowNumber,
                studentId: existingStudent.studentId,
                admissionNumber:
                  existingStudent.admissionNumber ?? p.admissionNumber,
                name: `${row.firstName} ${row.lastName}`,
                email: existingUser?.email ?? p.studentEmail,
                status: "success",
                action: "skipped",
                message:
                  "Student already exists and is fully set up — skipped.",
              };
            }

            // Create New Better Auth User
            const signUpResult = await auth.api.signUpEmail({
              body: {
                email: p.studentEmail,
                password: p.temporaryPassword,
                name: `${row.firstName} ${row.lastName}`,
              },
              headers: req.headers,
            });

            if (!signUpResult?.user?.id) {
              throw new Error("Better Auth signUpEmail did not return a user.");
            }

            const userId = signUpResult.user.id;
            const profileId = crypto.randomUUID();
            const studentDbId = crypto.randomUUID();
            const memberDbId = crypto.randomUUID();
            const enrollmentDbId = crypto.randomUUID();

            // Accumulate User Profile details
            profilesToCreate.push({
              id: profileId,
              userId,
              firstName: row.firstName,
              lastName: row.lastName,
              otherNames: row.otherNames ?? null,
              gender: row.gender,
              dateOfBirth: new Date(row.dateOfBirth),
              nationality: row.nationality ?? "Ghanaian",
              phone: row.phone ?? null,
              alternatePhone: row.alternatePhone ?? null,
              residentialAddress: row.residentialAddress ?? null,
              postalAddress: row.postalAddress ?? null,
              city: row.city ?? null,
              region: row.region ?? null,
              country: row.country ?? "Ghana",
              emergencyContactName: row.emergencyContactName ?? null,
              emergencyContactPhone: row.emergencyContactPhone ?? null,
              emergencyRelationship: row.emergencyRelationship ?? null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Accumulate Student Entity details
            studentsToCreate.push({
              id: studentDbId,
              profileId,
              schoolId: school.id,
              studentId: p.studentId,
              admissionNumber: p.admissionNumber,
              admissionDate: new Date(row.admissionDate),
              classId: p.classId,
              departmentId: p.departmentId,
              houseId: p.houseId,
              previousSchool: row.previousSchool ?? null,
              previousClass: row.previousClass ?? null,
              bloodGroup: row.bloodGroup ?? null,
              allergies: row.allergies ?? null,
              medicalConditions: row.medicalConditions ?? null,
              status: "ACTIVE",
              plainTextPassword: p.temporaryPassword,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Accumulate Member relation details
            membersToCreate.push({
              id: memberDbId,
              organizationId: school.organizationId,
              userId,
              role: "student",
              banned: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Accumulate Enrollment details
            if (p.classId) {
              enrollmentsToCreate.push({
                id: enrollmentDbId,
                studentId: studentDbId,
                classId: p.classId,
                academicYearId,
                termId,
                status: "ACTIVE",
                enrolledAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            return {
              row: rowNumber,
              studentId: p.studentId,
              admissionNumber: p.admissionNumber,
              name: `${row.firstName} ${row.lastName}`,
              email: p.studentEmail,
              password: p.temporaryPassword,
              status: "success",
              action: "created",
            };
          } catch (error) {
            console.error(`[Bulk Upload] Row ${rowNumber} failed:`, error);
            return {
              row: rowNumber,
              studentId: "",
              admissionNumber: "",
              name:
                row.firstName && row.lastName
                  ? `${row.firstName} ${row.lastName}`
                  : "Unknown",
              email: "",
              status: "error",
              message: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }),
      );

      results.push(...batchResults);
    }

    // ── 8. Execute Downstream Bulk Writes ──────────────────────────────────
    if (profilesToCreate.length > 0) {
      const newUserIds = profilesToCreate.map((p) => p.userId);

      // 1. Mark new users' emails as verified in bulk
      await prisma.user.updateMany({
        where: { id: { in: newUserIds } },
        data: { emailVerified: true },
      });

      // 2. Create User Profiles in bulk
      await prisma.userProfile.createMany({
        data: profilesToCreate,
      });

      // 3. Create Students in bulk
      await prisma.student.createMany({
        data: studentsToCreate,
      });

      // 4. Create Organization Members in bulk
      await prisma.member.createMany({
        data: membersToCreate,
      });

      // 5. Create Enrollments in bulk
      await prisma.enrollment.createMany({
        data: enrollmentsToCreate,
      });
    }

    // Execute repair updates
    if (repairUpdates.length > 0) {
      await Promise.all(
        repairUpdates.map(async (u) => {
          await prisma.student.update({
            where: { id: u.id },
            data: { plainTextPassword: u.passwordUpdate },
          });
          if (u.memberToCreate) {
            await prisma.member.create({
              data: u.memberToCreate,
            });
          }
        })
      );
    }

    // ── 9. Audit log ─────────────────────────────────────────────────────────
    const successful = results.filter(
      (r) => r.status === "success" && r.action === "created",
    ).length;
    const repaired = results.filter((r) => r.action === "updated").length;
    const skipped = results.filter((r) => r.action === "skipped").length;
    const failed = results.filter((r) => r.status === "error").length;

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "STUDENT",
        entityId: "BULK_UPLOAD",
        newValues: {
          schoolId: school.id,
          total: results.length,
          successful,
          repaired,
          skipped,
          failed,
          uploadedBy: session.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      results,
      summary: { total: results.length, successful, repaired, skipped, failed },
      message: `Bulk upload complete. ${successful} created, ${repaired} repaired, ${skipped} skipped, ${failed} failed.`,
    });
  } catch (error) {
    console.error("[Bulk Upload] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
