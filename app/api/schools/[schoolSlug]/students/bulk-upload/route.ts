// app/api/schools/[schoolSlug]/students/bulk-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { batchGenerateStudentIds } from "@/lib/utils/student-ids";
import * as XLSX from "xlsx";

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
  try {
    const { schoolSlug } = await params;
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only Excel files (.xlsx, .xls) are allowed.",
        },
        { status: 400 },
      );
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { cellDates: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<StudentRow>(worksheet);

    if (data.length === 0) {
      return NextResponse.json(
        {
          error:
            "No data found in file. Please ensure you have filled in student data.",
        },
        { status: 400 },
      );
    }

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

    // Generate IDs for all students
    const generatedIds = await batchGenerateStudentIds(
      school.id,
      school.code,
      data.length,
    );

    // Process each row
    const results = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row number (accounting for header)
      const { studentId, admissionNumber } = generatedIds[i];

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
            },
          },
        });
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
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

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[BULK_UPLOAD] Error", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
