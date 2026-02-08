// app/api/schools/[schoolSlug]/students/bulk-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { batchGenerateStudentIds } from "@/lib/utils/student-ids";
import * as XLSX from "xlsx";
import { Prisma } from "@/lib/generated/prisma/client";

interface StudentRow {
  "First Name*": string;
  "Last Name*": string;
  "Other Names"?: string;
  "Gender*": string;
  "Date of Birth*": string | number;
  Nationality?: string;
  Phone?: string;
  "Alternate Phone"?: string;
  "Residential Address"?: string;
  "Postal Address"?: string;
  City?: string;
  Region?: string;
  Country?: string;
  "Admission Date*": string | number;
  "Class Name"?: string;
  "Department Name"?: string;
  "House Name"?: string;
  "Previous School"?: string;
  "Previous Class"?: string;
  "Blood Group"?: string;
  Allergies?: string;
  "Medical Conditions"?: string;
  "Emergency Contact Name"?: string;
  "Emergency Contact Phone"?: string;
  "Emergency Relationship"?: string;
}

// Helper to convert Excel date serial number to YYYY-MM-DD
function excelDateToString(excelDate: number | string): string {
  if (typeof excelDate === "string") {
    // Already a string, validate format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(excelDate)) {
      return excelDate;
    }
    // Try to parse it
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    throw new Error(`Invalid date format: ${excelDate}`);
  }

  // Excel date serial number (days since 1900-01-01)
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split("T")[0];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  console.log("📦 [Bulk Upload] Starting bulk upload process...");

  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      console.log("❌ [Bulk Upload] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      console.log("❌ [Bulk Upload] School not found");
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    console.log(`🏫 [Bulk Upload] School: ${school.name}`);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.log("❌ [Bulk Upload] No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      console.log("❌ [Bulk Upload] Invalid file type");
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only Excel files (.xlsx, .xls) are allowed.",
        },
        { status: 400 },
      );
    }

    console.log(`📄 [Bulk Upload] Processing file: ${file.name}`);

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { cellDates: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<StudentRow>(worksheet);

    if (data.length === 0) {
      console.log("❌ [Bulk Upload] No data found in file");
      return NextResponse.json(
        {
          error:
            "No data found in file. Please ensure you have filled in student data.",
        },
        { status: 400 },
      );
    }

    console.log(`📊 [Bulk Upload] Found ${data.length} rows to process`);

    // Get class, department, house mappings
    const [classes, departments, houses] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId: school.id },
        select: { id: true, name: true },
      }),
      prisma.department.findMany({
        where: { schoolId: school.id },
        select: { id: true, name: true },
      }),
      prisma.house.findMany({
        where: { schoolId: school.id },
        select: { id: true, name: true },
      }),
    ]);

    const classMap = new Map(
      classes.map((c) => [c.name.trim().toLowerCase(), c.id]),
    );
    const deptMap = new Map(
      departments.map((d) => [d.name.trim().toLowerCase(), d.id]),
    );
    const houseMap = new Map(
      houses.map((h) => [h.name.trim().toLowerCase(), h.id]),
    );

    console.log("🆔 [Bulk Upload] Generating student IDs...");
    // Generate IDs for all students
    const generatedIds = await batchGenerateStudentIds(
      school.id,
      school.code,
      data.length,
    );
    console.log(`✅ [Bulk Upload] Generated ${generatedIds.length} IDs`);

    // Process each row
    const results = [];
    console.log("\n📝 [Bulk Upload] Processing students...\n");

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row number (accounting for header)
      const { studentId, admissionNumber } = generatedIds[i];

      console.log(`[Row ${rowNumber}] Processing...`);

      try {
        // Validate required fields
        const firstName = row["First Name*"]?.toString().trim();
        const lastName = row["Last Name*"]?.toString().trim();
        const gender = row["Gender*"]?.toString().trim().toUpperCase();
        const dateOfBirth = row["Date of Birth*"];
        const admissionDate = row["Admission Date*"];

        if (
          !firstName ||
          !lastName ||
          !gender ||
          !dateOfBirth ||
          !admissionDate
        ) {
          console.log(`❌ [Row ${rowNumber}] Missing required fields`);
          results.push({
            row: rowNumber,
            studentId,
            admissionNumber,
            name: `${firstName || ""} ${lastName || ""}`.trim() || "Unknown",
            status: "error",
            message:
              "Missing required fields (First Name, Last Name, Gender, Date of Birth, or Admission Date)",
          });
          continue;
        }

        // Validate gender
        if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
          console.log(`❌ [Row ${rowNumber}] Invalid gender: ${gender}`);
          results.push({
            row: rowNumber,
            studentId,
            admissionNumber,
            name: `${firstName} ${lastName}`,
            status: "error",
            message: `Invalid gender: ${gender}. Must be MALE, FEMALE, or OTHER (uppercase)`,
          });
          continue;
        }

        // Convert dates
        let dobString: string;
        let admDateString: string;

        try {
          dobString = excelDateToString(dateOfBirth);
          admDateString = excelDateToString(admissionDate);
        } catch (error) {
          console.log(`❌ [Row ${rowNumber}] Invalid date format`);
          results.push({
            row: rowNumber,
            studentId,
            admissionNumber,
            name: `${firstName} ${lastName}`,
            status: "error",
            message: `Invalid date format. Use YYYY-MM-DD (e.g., 2010-01-15)`,
          });
          continue;
        }

        // Find class, department, house IDs
        const className = row["Class Name"]?.toString().trim();
        const deptName = row["Department Name"]?.toString().trim();
        const houseName = row["House Name"]?.toString().trim();

        const classId = className
          ? classMap.get(className.toLowerCase())
          : undefined;
        const departmentId = deptName
          ? deptMap.get(deptName.toLowerCase())
          : undefined;
        const houseId = houseName
          ? houseMap.get(houseName.toLowerCase())
          : undefined;

        // Warn if name provided but not found
        if (className && !classId) {
          console.log(`❌ [Row ${rowNumber}] Class '${className}' not found`);
          results.push({
            row: rowNumber,
            studentId,
            admissionNumber,
            name: `${firstName} ${lastName}`,
            status: "error",
            message: `Class '${className}' not found. Please use exact class name from the template.`,
          });
          continue;
        }

        if (deptName && !departmentId) {
          console.log(
            `❌ [Row ${rowNumber}] Department '${deptName}' not found`,
          );
          results.push({
            row: rowNumber,
            studentId,
            admissionNumber,
            name: `${firstName} ${lastName}`,
            status: "error",
            message: `Department '${deptName}' not found. Please use exact department name from the template.`,
          });
          continue;
        }

        if (houseName && !houseId) {
          console.log(`❌ [Row ${rowNumber}] House '${houseName}' not found`);
          results.push({
            row: rowNumber,
            studentId,
            admissionNumber,
            name: `${firstName} ${lastName}`,
            status: "error",
            message: `House '${houseName}' not found. Please use exact house name from the template.`,
          });
          continue;
        }

        // Create student in transaction
        await prisma.$transaction(async (tx) => {
          // Create temporary user for student
          const tempUser = await tx.user.create({
            data: {
              name: `${firstName} ${lastName}`,
              email: `${studentId.toLowerCase()}@temp.${school.subdomain}.edu`,
              emailVerified: false,
              role: "user",
            },
          });

          // Create profile
          const profile = await tx.userProfile.create({
            data: {
              userId: tempUser.id,
              firstName,
              lastName,
              otherNames: row["Other Names"]?.toString().trim() || null,
              phone: row["Phone"]?.toString().trim() || null,
              alternatePhone: row["Alternate Phone"]?.toString().trim() || null,
              gender: gender as "MALE" | "FEMALE" | "OTHER",
              dateOfBirth: new Date(dobString),
              nationality: row["Nationality"]?.toString().trim() || "Ghanaian",
              residentialAddress:
                row["Residential Address"]?.toString().trim() || null,
              postalAddress: row["Postal Address"]?.toString().trim() || null,
              city: row["City"]?.toString().trim() || null,
              region: row["Region"]?.toString().trim() || null,
              country: row["Country"]?.toString().trim() || "Ghana",
              emergencyContactName:
                row["Emergency Contact Name"]?.toString().trim() || null,
              emergencyContactPhone:
                row["Emergency Contact Phone"]?.toString().trim() || null,
              emergencyRelationship:
                row["Emergency Relationship"]?.toString().trim() || null,
            },
          });

          // Create student
          await tx.student.create({
            data: {
              profileId: profile.id,
              schoolId: school.id,
              studentId,
              admissionNumber,
              admissionDate: new Date(admDateString),
              classId,
              departmentId,
              houseId,
              previousSchool: row["Previous School"]?.toString().trim() || null,
              previousClass: row["Previous Class"]?.toString().trim() || null,
              bloodGroup: row["Blood Group"]?.toString().trim() || null,
              allergies: row["Allergies"]?.toString().trim() || null,
              medicalConditions:
                row["Medical Conditions"]?.toString().trim() || null,
              status: "ACTIVE",
            },
          });
        });

        console.log(`✅ [Row ${rowNumber}] Student created successfully`);

        results.push({
          row: rowNumber,
          studentId,
          admissionNumber,
          name: `${firstName} ${lastName}`,
          status: "success",
        });

        // Log audit
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "CREATE",
            entityType: "Student",
            entityId: studentId,
            newValues: {
              studentId,
              admissionNumber,
              name: `${firstName} ${lastName}`,
              bulkUpload: true,
            } as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        console.error(`❌ [Row ${rowNumber}] Error:`, error);
        results.push({
          row: rowNumber,
          studentId,
          admissionNumber,
          name:
            row["First Name*"] && row["Last Name*"]
              ? `${row["First Name*"]} ${row["Last Name*"]}`
              : "Unknown",
          status: "error",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    console.log(
      `\n✅ [Bulk Upload] Completed: ${successCount} successful, ${errorCount} errors\n`,
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("❌ [Bulk Upload] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
