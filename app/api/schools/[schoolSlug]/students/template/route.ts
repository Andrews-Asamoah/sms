// app/api/schools/[schoolSlug]/students/template/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

// ============================================================================
// TYPES
// ============================================================================

interface SchoolSettings {
  currentAcademicYearId?: string | null;
  currentTermId?: string | null;
  [key: string]: unknown;
}

// ============================================================================
// GET — download bulk upload template
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // ── 2. Load school settings first so we can filter classes by current year
    const schoolBase = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { settings: true, code: true },
    });

    if (!schoolBase) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const { currentAcademicYearId } =
      (schoolBase.settings as unknown as SchoolSettings) ?? {};

    // ── 3. Load school with reference data ───────────────────────────────────
    //
    // Classes are filtered to the current academic year so the template only
    // shows classes the admin would actually assign new students to.
    //
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        code: true,
        classes: {
          where: {
            isActive: true,
            ...(currentAcademicYearId
              ? { academicYearId: currentAcademicYearId }
              : {}),
          },
          select: { name: true },
          orderBy: { name: "asc" },
        },
        departments: {
          where: { isActive: true },
          select: { name: true },
          orderBy: { name: "asc" },
        },
        houses: {
          where: { isActive: true },
          select: { name: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // ── 4. Build workbook ────────────────────────────────────────────────────
    const workbook = XLSX.utils.book_new();

    // Today's date in YYYY-MM-DD — Ghana runs on GMT/UTC+0 so toISOString()
    // is safe and will never show a previous day's date.
    const today = new Date().toISOString().split("T")[0];
    const schoolPrefix = schoolSlug.toUpperCase();

    // ── Sheet 1: Students (data entry sheet) ─────────────────────────────────
    const headers = [
      "First Name*",
      "Last Name*",
      "Other Names",
      "Gender*",
      "Date of Birth*",
      "Nationality",
      "Phone",
      "Alternate Phone",
      "Residential Address",
      "Postal Address",
      "City",
      "Region",
      "Country",
      "Admission Date*",
      "Class Name",
      "Department Name",
      "House Name",
      "Previous School",
      "Previous Class",
      "Blood Group",
      "Allergies",
      "Medical Conditions",
      "Emergency Contact Name",
      "Emergency Contact Phone",
      "Emergency Relationship",
    ];

    const sampleRow = [
      "John",
      "Doe",
      "Michael",
      "MALE",
      "2010-01-15",
      "Ghanaian",
      "+233244123456",
      "+233201234567",
      "123 Main Street, Accra",
      "P.O. Box 123",
      "Accra",
      "Greater Accra",
      "Ghana",
      today,
      school.classes[0]?.name ?? "",
      school.departments[0]?.name ?? "",
      school.houses[0]?.name ?? "",
      "ABC Primary School",
      "Grade 5",
      "O+",
      "None",
      "None",
      "Jane Doe",
      "+233244987654",
      "Mother",
    ];

    const dataSheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

    dataSheet["!cols"] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 15 }, // Other Names
      { wch: 10 }, // Gender
      { wch: 15 }, // Date of Birth
      { wch: 12 }, // Nationality
      { wch: 15 }, // Phone
      { wch: 15 }, // Alternate Phone
      { wch: 25 }, // Residential Address
      { wch: 20 }, // Postal Address
      { wch: 12 }, // City
      { wch: 15 }, // Region
      { wch: 12 }, // Country
      { wch: 15 }, // Admission Date
      { wch: 15 }, // Class Name
      { wch: 15 }, // Department Name
      { wch: 15 }, // House Name
      { wch: 20 }, // Previous School
      { wch: 12 }, // Previous Class
      { wch: 12 }, // Blood Group
      { wch: 15 }, // Allergies
      { wch: 20 }, // Medical Conditions
      { wch: 20 }, // Emergency Contact Name
      { wch: 15 }, // Emergency Contact Phone
      { wch: 15 }, // Emergency Relationship
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, "Students");

    // ── Sheet 2: Instructions ─────────────────────────────────────────────────
    const currentYearNote = currentAcademicYearId
      ? "Classes shown are filtered to the current academic year."
      : "No current academic year is set — all active classes are shown.";

    const instructionsData = [
      ["STUDENT BULK UPLOAD TEMPLATE — INSTRUCTIONS"],
      [""],
      ["IMPORTANT NOTES:"],
      [
        "1. Student ID and Admission Number are AUTO-GENERATED — do not add these columns.",
      ],
      ["2. Student IDs are generated as: STU-YYYY-NNNN (e.g., STU-2025-0042)"],
      [
        `3. Admission Numbers are generated as: ${schoolPrefix}-YY-NNNN (e.g., ${schoolPrefix}-25-0042)`,
      ],
      [
        "   The year (YYYY / YY) is derived automatically from the Admission Date column.",
      ],
      ["4. Fields marked with * are REQUIRED."],
      ["5. Keep the header row exactly as it is (row 1)."],
      ["6. Delete the sample data row before uploading your real data."],
      ["7. Save the file in .xlsx or .xls format only."],
      [currentYearNote],
      [""],
      ["REQUIRED FIELDS (marked with *):"],
      ["  • First Name"],
      ["  • Last Name"],
      ["  • Gender  —  must be exactly: MALE, FEMALE, or OTHER (uppercase)"],
      ["  • Date of Birth  —  format: YYYY-MM-DD  e.g. 2010-01-15"],
      ["  • Admission Date  —  format: YYYY-MM-DD"],
      [""],
      ["GENDER VALUES:"],
      ["  MALE  |  FEMALE  |  OTHER"],
      [""],
      ["BLOOD GROUP OPTIONS:"],
      ["  A+  |  A-  |  B+  |  B-  |  AB+  |  AB-  |  O+  |  O-"],
      [""],
      ["AVAILABLE CLASSES (current academic year):"],
      ...(school.classes.length > 0
        ? school.classes.map((c) => [`  • ${c.name}`])
        : [["  (No active classes found for the current academic year)"]]),
      [""],
      ["AVAILABLE DEPARTMENTS:"],
      ...(school.departments.length > 0
        ? school.departments.map((d) => [`  • ${d.name}`])
        : [["  (No active departments found)"]]),
      [""],
      ["AVAILABLE HOUSES:"],
      ...(school.houses.length > 0
        ? school.houses.map((h) => [`  • ${h.name}`])
        : [["  (No active houses found)"]]),
      [""],
      ["DATE FORMAT EXAMPLES:"],
      ["  2010-01-15  →  January 15, 2010"],
      ["  2009-12-25  →  December 25, 2009"],
      [""],
      ["TIPS:"],
      ["  1. Use the exact class / department / house names listed above."],
      ["  2. Leave optional fields blank if the data is not available."],
      ["  3. Phone numbers may include a country code, e.g. +233244123456."],
      ["  4. Ensure all dates are in YYYY-MM-DD format."],
      ["  5. Gender must be uppercase: MALE, FEMALE, or OTHER."],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet["!cols"] = [{ wch: 85 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    // ── Sheet 3: Reference data ───────────────────────────────────────────────
    const referenceData: string[][] = [
      ["REFERENCE DATA"],
      [""],
      ["Classes (current academic year)"],
      ...(school.classes.length > 0
        ? school.classes.map((c) => [c.name])
        : [["(none)"]]),
      [""],
      ["Departments"],
      ...(school.departments.length > 0
        ? school.departments.map((d) => [d.name])
        : [["(none)"]]),
      [""],
      ["Houses"],
      ...(school.houses.length > 0
        ? school.houses.map((h) => [h.name])
        : [["(none)"]]),
      [""],
      ["Gender Options"],
      ["MALE"],
      ["FEMALE"],
      ["OTHER"],
      [""],
      ["Blood Groups"],
      ["A+"],
      ["A-"],
      ["B+"],
      ["B-"],
      ["AB+"],
      ["AB-"],
      ["O+"],
      ["O-"],
    ];

    const referenceSheet = XLSX.utils.aoa_to_sheet(referenceData);
    referenceSheet["!cols"] = [{ wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, referenceSheet, "Reference");

    // ── 5. Write and return ──────────────────────────────────────────────────
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Use school.code when available, fall back to schoolSlug so the
    // filename is always valid even if code is somehow empty.
    const fileLabel = school.code || schoolSlug;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="students-upload-template-${fileLabel}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Template Download] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
