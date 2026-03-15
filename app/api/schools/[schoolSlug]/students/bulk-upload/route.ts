// app/api/schools/[schoolSlug]/students/bulk-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import type { Gender } from "@/lib/generated/prisma/client";
import { headers } from "next/headers";

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateUniqueStudentEmail(
  firstName: string,
  lastName: string,
  schoolSubdomain: string,
  generatedEmails: Set<string>,
): Promise<string> {
  const cleanFirst = firstName
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const firstInitial = cleanFirst.charAt(0) || "s";
  const cleanLast =
    lastName
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "") || "student";
  const baseEmailPrefix = `${firstInitial}.${cleanLast}`;

  let currentEmail = `${baseEmailPrefix}@${schoolSubdomain}.edu.gh`;
  let counter = 1;

  while (true) {
    if (generatedEmails.has(currentEmail)) {
      currentEmail = `${baseEmailPrefix}${counter}@${schoolSubdomain}.edu.gh`;
      counter++;
      continue;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: currentEmail },
    });

    if (!existingUser) {
      break;
    }

    currentEmail = `${baseEmailPrefix}${counter}@${schoolSubdomain}.edu.gh`;
    counter++;
  }

  generatedEmails.add(currentEmail);
  return currentEmail;
}

// ============================================================================
// EXCEL PARSING
// ============================================================================

function parseExcelFile(buffer: Buffer): StudentRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false }) as Record<
    string,
    unknown
  >[];

  const getVal = (row: Record<string, any>, ...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined) return row[key];
      const normalizedReq = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const actualKey = Object.keys(row).find((k) => {
        const normalizedActual = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normalizedActual === normalizedReq;
      });
      if (actualKey) return row[actualKey];
    }
    return undefined;
  };

  return rows.map((row) => {
    return {
      firstName: String(
        getVal(row, "First Name*", "First Name", "FirstName") || "",
      ).trim(),
      lastName: String(
        getVal(row, "Last Name*", "Last Name", "LastName") || "",
      ).trim(),
      otherNames: getVal(row, "Other Names")
        ? String(getVal(row, "Other Names")).trim()
        : null,
      gender: String(
        getVal(row, "Gender*", "Gender") || "",
      ).toUpperCase() as Gender,
      dateOfBirth: String(
        getVal(row, "Date of Birth*", "Date of Birth", "DOB") || "",
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
      region: getVal(row, "Region")
        ? String(getVal(row, "Region")).trim()
        : null,
      country: getVal(row, "Country")
        ? String(getVal(row, "Country")).trim()
        : null,
      admissionDate: String(
        getVal(row, "Admission Date*", "Admission Date") || "",
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
    };
  });
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

    const session = await requireSchoolAccess(schoolSlug);
    const schoolAccess = getSchoolRole(session, schoolSlug);

    if (!schoolAccess) {
      return NextResponse.json(
        { error: "No access to this school" },
        { status: 403 },
      );
    }

    if (
      schoolAccess.effectiveRole !== "admin" &&
      schoolAccess.effectiveRole !== "owner"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let studentRows: StudentRow[] = [];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      studentRows = body.students || [];
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      studentRows = parseExcelFile(buffer);
    }

    if (studentRows.length === 0) {
      return NextResponse.json(
        { error: "No student data found" },
        { status: 400 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      include: {
        classes: true,
        departments: true,
        houses: true,
        subscription: { select: { maxStudents: true, planName: true } },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // ========================================================================
    // STEP 2: Enforce Student Limits
    // ========================================================================
    const existingActiveStudents = await prisma.student.findMany({
      where: { schoolId: school.id, status: "ACTIVE" },
      include: { profile: true },
    });

    const studentCount = existingActiveStudents.length;
    const maxStudents = school.subscription?.maxStudents ?? null; // null means unlimited

    const existingStudentKeys = new Set(
      existingActiveStudents
        .map((s) => {
          try {
            return `${s.profile.firstName.toLowerCase().trim()}_${s.profile.lastName.toLowerCase().trim()}_${new Date(s.profile.dateOfBirth).toISOString().split("T")[0]}`;
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    );

    let newStudentsCount = 0;
    for (const row of studentRows) {
      if (!row.firstName || !row.lastName || !row.dateOfBirth) continue;
      try {
        const dob = new Date(row.dateOfBirth).toISOString().split("T")[0];
        const key = `${String(row.firstName).toLowerCase().trim()}_${String(row.lastName).toLowerCase().trim()}_${dob}`;
        if (!existingStudentKeys.has(key)) {
          newStudentsCount++;
        }
      } catch {
        newStudentsCount++;
      }
    }

    if (maxStudents !== null) {
      const remainingSlots = maxStudents - studentCount;

      if (newStudentsCount > remainingSlots) {
        return NextResponse.json(
          {
            error: `Student limit exceeded for ${school.subscription?.planName || "Free Plan"}.`,
            details: `Current students: ${studentCount}, Limit: ${maxStudents}. You are attempting to add ${newStudentsCount} new students, but only ${remainingSlots} slots are available. Please upgrade your subscription to add more students.`,
          },
          { status: 403 },
        );
      }
    }


    const { currentAcademicYearId, currentTermId } =
      (school.settings as any) || {};

    if (!currentAcademicYearId) {
      return NextResponse.json(
        {
          error:
            "Global Academic Year not set. Please set it in system settings first.",
        },
        { status: 400 },
      );
    }

    const results: ProcessResult[] = [];
    const generatedStudentEmails = new Set<string>();
    const schoolPrefix = schoolSlug.toUpperCase();
    const yearSequences = new Map<
      number,
      { student: number; admission: number }
    >();

    // Process rows in parallel batches of 5 to speed up but avoid overwhelming resources
    const BATCH_SIZE = 5;
    for (let i = 0; i < studentRows.length; i += BATCH_SIZE) {
      const batch = studentRows.slice(i, i + BATCH_SIZE);

      // Reserve sequences and emails sequentially to avoid race conditions
      const preparedBatch: Array<{
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        studentId: string;
        admissionNumber: string;
        studentEmail: string;
      }> = [];

      for (const row of batch) {
        const missingFields = [];
        if (!row.firstName) missingFields.push("First Name");
        if (!row.lastName) missingFields.push("Last Name");
        if (!row.gender) missingFields.push("Gender");
        if (!row.dateOfBirth) missingFields.push("Date of Birth");
        if (!row.admissionDate) missingFields.push("Admission Date");

        if (missingFields.length > 0) continue;

        const admDate = new Date(row.admissionDate);
        if (isNaN(admDate.getTime())) continue;
        const admYear = admDate.getFullYear();
        const admYearShort = admYear.toString().slice(-2);

        if (!yearSequences.has(admYear)) {
          const allYearStudents = await prisma.student.findMany({
            where: {
              schoolId: school.id,
              OR: [
                { studentId: { startsWith: `STU-${admYear}-` } },
                {
                  admissionNumber: {
                    startsWith: `${schoolPrefix}-${admYearShort}-`,
                  },
                },
              ],
            },
            select: { studentId: true, admissionNumber: true },
          });

          let nextS = 1;
          let nextA = 1;

          for (const s of allYearStudents) {
            if (s.studentId.startsWith(`STU-${admYear}-`)) {
              const parts = s.studentId.split("-");
              const lastNum = parseInt(parts[parts.length - 1]);
              if (!isNaN(lastNum) && lastNum >= nextS) nextS = lastNum + 1;
            }
            if (
              s.admissionNumber?.startsWith(`${schoolPrefix}-${admYearShort}-`)
            ) {
              const parts = s.admissionNumber.split("-");
              const lastNum = parseInt(parts[parts.length - 1]);
              if (!isNaN(lastNum) && lastNum >= nextA) nextA = lastNum + 1;
            }
          }
          yearSequences.set(admYear, { student: nextS, admission: nextA });
        }

        const sequences = yearSequences.get(admYear)!;
        const studentId = `STU-${admYear}-${sequences.student.toString().padStart(4, "0")}`;
        const admissionNumber = `${schoolPrefix}-${admYearShort}-${sequences.admission.toString().padStart(4, "0")}`;

        sequences.student++;
        sequences.admission++;

        const studentEmail = await generateUniqueStudentEmail(
          row.firstName,
          row.lastName,
          school.subdomain,
          generatedStudentEmails,
        );
        preparedBatch.push({
          firstName: row.firstName,
          lastName: row.lastName,
          dateOfBirth: row.dateOfBirth,
          studentId,
          admissionNumber,
          studentEmail,
        });
      }

      const batchPromises = batch.map(async (row, index) => {
        const rowNumber = i + index + 2;
        const prepared = preparedBatch.find(
          (p) =>
            p.firstName === row.firstName &&
            p.lastName === row.lastName &&
            p.dateOfBirth === row.dateOfBirth,
        );

        try {
          if (!prepared) {
            if (
              !row.firstName ||
              !row.lastName ||
              !row.gender ||
              !row.dateOfBirth ||
              !row.admissionDate
            ) {
              throw new Error("Missing required fields");
            }
            throw new Error("Invalid data format in row");
          }

          const { studentId, admissionNumber, studentEmail } = prepared;

          const existingStudent = await prisma.student.findFirst({
            where: {
              schoolId: school.id,
              profile: {
                firstName: row.firstName,
                lastName: row.lastName,
                dateOfBirth: new Date(row.dateOfBirth),
              },
            },
            include: { profile: { include: { user: true } } },
          });

          if (existingStudent) {
            return {
              row: rowNumber,
              studentId: existingStudent.studentId,
              admissionNumber:
                existingStudent.admissionNumber || admissionNumber,
              name: `${row.firstName} ${row.lastName}`,
              email: existingStudent.profile?.user?.email || studentEmail,
              status: "success" as const,
              action: "skipped" as const,
              message: "Student already exists, skipped.",
            };
          }

          let finalStudentId = studentId;
          let finalAdmissionNumber = admissionNumber;
          const temporaryPassword = crypto.randomBytes(4).toString("hex");

          const classRecord = row.className
            ? school.classes.find((c: any) => c.name === row.className)
            : null;
          const department = row.departmentName
            ? school.departments.find((d: any) => d.name === row.departmentName)
            : null;
          const house = row.houseName
            ? school.houses.find((h: any) => h.name === row.houseName)
            : null;

          const existingUser = await prisma.user.findUnique({
            where: { email: studentEmail },
          });
          let userId: string;

          if (existingUser) {
            const studentExists = await prisma.student.findFirst({
              where: {
                schoolId: school.id,
                profile: { userId: existingUser.id },
              },
            });
            if (studentExists) {
              throw new Error(
                `Student with email ${studentEmail} already exists`,
              );
            }
            userId = existingUser.id;

            // Check if membership already exists, otherwise add via auth api
            const existingMember = await prisma.member.findFirst({
              where: {
                organizationId: school.organizationId,
                userId: userId,
              },
            });

            if (!existingMember) {
              await auth.api.addMember({
                body: {
                  organizationId: school.organizationId,
                  userId: userId,
                  role: "student",
                },
              });
              // Wait a moment for the afterAddMember hook to complete
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          } else {
            // Create user directly via Prisma to bypass auth.api permission checks for school admins
            const newUser = await prisma.user.create({
              data: {
                id: crypto.randomUUID(),
                name: `${row.firstName} ${row.lastName}`,
                email: studentEmail,
                emailVerified: true,
                role: "user", // The system role is "user", org role is "student"
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            userId = newUser.id;

            // Add student to organization using better-auth api
            await auth.api.addMember({
              body: {
                organizationId: school.organizationId,
                userId: userId,
                role: "student",
              },
            });

            // Wait a moment for the afterAddMember hook to complete
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const userProfile = await prisma.userProfile.upsert({
            where: { userId },
            update: {
              firstName: row.firstName,
              lastName: row.lastName,
              otherNames: row.otherNames,
              gender: row.gender,
              dateOfBirth: new Date(row.dateOfBirth),
              nationality: row.nationality,
              phone: row.phone,
              alternatePhone: row.alternatePhone,
              residentialAddress: row.residentialAddress,
              postalAddress: row.postalAddress,
              city: row.city,
              region: row.region,
              country: row.country,
              emergencyContactName: row.emergencyContactName,
              emergencyContactPhone: row.emergencyContactPhone,
              emergencyRelationship: row.emergencyRelationship,
            },
            create: {
              userId,
              firstName: row.firstName,
              lastName: row.lastName,
              otherNames: row.otherNames,
              gender: row.gender,
              dateOfBirth: new Date(row.dateOfBirth),
              nationality: row.nationality,
              phone: row.phone,
              alternatePhone: row.alternatePhone,
              residentialAddress: row.residentialAddress,
              postalAddress: row.postalAddress,
              city: row.city,
              region: row.region,
              country: row.country,
              emergencyContactName: row.emergencyContactName,
              emergencyContactPhone: row.emergencyContactPhone,
              emergencyRelationship: row.emergencyRelationship,
            },
          });

          let student = await prisma.student.findFirst({
            where: { schoolId: school.id, profileId: userProfile.id },
          });

          if (!student) {
            student = await prisma.student.create({
              data: {
                schoolId: school.id,
                profileId: userProfile.id,
                studentId: finalStudentId,
                admissionNumber: finalAdmissionNumber,
                admissionDate: new Date(row.admissionDate),
                classId: classRecord?.id || null,
                departmentId: department?.id || null,
                houseId: house?.id || null,
                previousSchool: row.previousSchool,
                previousClass: row.previousClass,
                bloodGroup: row.bloodGroup,
                allergies: row.allergies,
                medicalConditions: row.medicalConditions,
                status: "ACTIVE",
                plainTextPassword: temporaryPassword,
              },
            });

            if (classRecord) {
              await prisma.enrollment.create({
                data: {
                  studentId: student.id,
                  classId: classRecord.id,
                  academicYearId: currentAcademicYearId,
                  termId: currentTermId || null,
                  status: "ACTIVE",
                },
              });
            }
          } else {
            student = await prisma.student.update({
              where: { id: student.id },
              data: {
                classId: classRecord?.id || student.classId,
                departmentId: department?.id || student.departmentId,
                houseId: house?.id || student.houseId,
                previousSchool: row.previousSchool || student.previousSchool,
                previousClass: row.previousClass || student.previousClass,
                bloodGroup: row.bloodGroup || student.bloodGroup,
                allergies: row.allergies || student.allergies,
                medicalConditions:
                  row.medicalConditions || student.medicalConditions,
              },
            });

            if (classRecord) {
              await prisma.enrollment.upsert({
                where: {
                  studentId_classId_academicYearId_termId: {
                    studentId: student.id,
                    classId: classRecord.id,
                    academicYearId: currentAcademicYearId,
                    termId: currentTermId || null,
                  },
                },
                update: { status: "ACTIVE" },
                create: {
                  studentId: student.id,
                  classId: classRecord.id,
                  academicYearId: currentAcademicYearId,
                  termId: currentTermId || null,
                  status: "ACTIVE",
                },
              });
            }
          }

          return {
            row: rowNumber,
            studentId,
            admissionNumber,
            name: `${row.firstName} ${row.lastName}`,
            email: studentEmail,
            password: temporaryPassword,
            status: "success" as const,
            action: "created" as const,
          };
        } catch (error: any) {
          console.error(`❌ [Bulk Upload] Row ${rowNumber} failed:`, error);
          return {
            row: rowNumber,
            studentId: "",
            admissionNumber: "",
            name:
              row.firstName && row.lastName
                ? `${row.firstName} ${row.lastName}`
                : "Unknown",
            email: "",
            status: "error" as const,
            message: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successful = results.filter(
      (r) => r.status === "success" && r.action !== "skipped",
    ).length;
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
          totalStudents: results.length,
          successful,
          skipped,
          failed,
          uploadedBy: session.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      results,
      summary: { total: results.length, successful, skipped, failed },
      message: `Bulk upload complete. ${successful} new students created, ${skipped} existing students skipped, ${failed} failed.`,
    });
  } catch (error) {
    console.error("[Bulk Upload] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
