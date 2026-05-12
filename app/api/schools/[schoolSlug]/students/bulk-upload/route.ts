// app/api/schools/[schoolSlug]/students/bulk-upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import type { Gender } from "@prisma/client";
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

    // ── 6. Phase A — sequential reservation of IDs and emails ───────────────
    //
    // All ID generation and email reservation happens sequentially before any
    // DB writes. This guarantees the parallel Phase B never produces duplicate
    // IDs or emails within the same upload batch.
    //

    // Optimization: Bulk fetch existing emails to avoid sequential DB checks.
    // This makes the email generation instantly fast.
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

      const classRecord = row.className
        ? (school.classes.find((c) => c.name === row.className) ?? null)
        : null;
      let departmentId = row.departmentName
        ? (school.departments.find((d) => d.name === row.departmentName)?.id ??
          null)
        : null;

      if (classRecord?.departmentId && !departmentId) {
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
        classId: classRecord?.id ?? null,
        departmentId: departmentId,
        houseId: house?.id ?? null,
        valid: true,
      });
    }

    // ── 7. Phase B — parallel processing in batches of 3 ────────────────────
    // A small batch size prevents `bcryptjs` from freezing the Node event loop.
    const BATCH_SIZE = 3;
    const results: ProcessResult[] = [];

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
            // ── Duplicate check + account repair ─────────────────────────
            const existingStudent = await prisma.student.findFirst({
              where: {
                schoolId: school.id,
                profile: {
                  firstName: row.firstName,
                  lastName: row.lastName,
                  dateOfBirth: new Date(row.dateOfBirth),
                },
              },
              include: {
                profile: {
                  include: {
                    user: { include: { accounts: true } },
                  },
                },
              },
            });

            if (existingStudent) {
              const existingUser = existingStudent.profile?.user;

              if (existingUser && existingUser.accounts.length === 0) {
                // Repair: user exists but missing account row (created before
                // the signUpEmail fix) — recreate it atomically.
                await auth.api.signUpEmail({
                  body: {
                    email: existingUser.email,
                    password: p.temporaryPassword,
                    name: existingUser.name,
                  },
                  headers: req.headers,
                });

                await prisma.student.update({
                  where: { id: existingStudent.id },
                  data: { plainTextPassword: p.temporaryPassword },
                });

                const existingMember = await prisma.member.findFirst({
                  where: {
                    organizationId: school.organizationId,
                    userId: existingUser.id,
                  },
                });

                if (!existingMember) {
                  await auth.api.addMember({
                    body: {
                      organizationId: school.organizationId,
                      userId: existingUser.id,
                      role: "student",
                    },
                    headers: req.headers,
                  });
                }

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

            // ── New student ───────────────────────────────────────────────
            // Since `p.studentEmail` is guaranteed unique across DB & batch (Phase A),
            // we can confidently create a new user without a lookup collision.
            
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

            const existingMember = await prisma.member.findFirst({
              where: { organizationId: school.organizationId, userId },
            });

            if (!existingMember) {
              await auth.api.addMember({
                body: {
                  organizationId: school.organizationId,
                  userId,
                  role: "student",
                },
                headers: req.headers,
              });
            }

            const profileData = {
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
            };

            const userProfile = await prisma.userProfile.upsert({
              where: { userId },
              update: profileData,
              create: { userId, ...profileData },
            });

            let student = await prisma.student.findFirst({
              where: { schoolId: school.id, profileId: userProfile.id },
            });

            if (!student) {
              student = await prisma.student.create({
                data: {
                  schoolId: school.id,
                  profileId: userProfile.id,
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
                },
              });
            } else {
              student = await prisma.student.update({
                where: { id: student.id },
                data: {
                  classId: p.classId ?? student.classId,
                  departmentId: p.departmentId ?? student.departmentId,
                  houseId: p.houseId ?? student.houseId,
                  previousSchool: row.previousSchool ?? student.previousSchool,
                  previousClass: row.previousClass ?? student.previousClass,
                  bloodGroup: row.bloodGroup ?? student.bloodGroup,
                  allergies: row.allergies ?? student.allergies,
                  medicalConditions:
                    row.medicalConditions ?? student.medicalConditions,
                },
              });
            }

            if (p.classId) {
              await prisma.enrollment.upsert({
                where: {
                  studentId_classId_academicYearId_termId: {
                    studentId: student.id,
                    classId: p.classId,
                    academicYearId,
                    termId,
                  },
                },
                update: { status: "ACTIVE" },
                create: {
                  studentId: student.id,
                  classId: p.classId,
                  academicYearId,
                  termId,
                  status: "ACTIVE",
                },
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

    // ── 8. Audit log ─────────────────────────────────────────────────────────
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
