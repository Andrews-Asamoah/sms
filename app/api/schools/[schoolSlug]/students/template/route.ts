// app/api/schools/[schoolSlug]/students/template/route.ts - UPDATED
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(
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
      include: {
        classes: {
          where: { isActive: true },
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

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create main data sheet with headers and sample data
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
      "Parent Email", // NEW - for guardian invitation
      "Parent Name", // NEW - for guardian invitation
      "Parent Phone", // NEW - for guardian invitation
      "Parent Relationship", // NEW - for guardian invitation
    ];

    // Sample data row
    const sampleData = [
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
      new Date().toISOString().split("T")[0],
      school.classes[0]?.name || "Class 1",
      school.departments[0]?.name || "",
      school.houses[0]?.name || "",
      "ABC Primary School",
      "Grade 5",
      "O+",
      "None",
      "None",
      "Jane Doe",
      "+233244987654",
      "Mother",
      "jane.doe@example.com", // Parent email
      "Jane Doe", // Parent name
      "+233244987654", // Parent phone
      "MOTHER", // Parent relationship
    ];

    const data = [headers, sampleData];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const colWidths = [
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
      { wch: 25 }, // Parent Email
      { wch: 20 }, // Parent Name
      { wch: 15 }, // Parent Phone
      { wch: 15 }, // Parent Relationship
    ];
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    // Create instructions sheet
    const instructionsData = [
      ["STUDENT BULK UPLOAD TEMPLATE - INSTRUCTIONS"],
      [""],
      ["IMPORTANT NOTES:"],
      [
        "1. Student ID and Admission Number will be AUTO-GENERATED - DO NOT include these columns",
      ],
      ["2. Student IDs will be generated as: STU00001, STU00002, etc."],
      [
        `3. Admission Numbers will be generated as: ${school.code}0001, ${school.code}0002, etc.`,
      ],
      ["4. Fields marked with * are REQUIRED"],
      ["5. Keep the header row as is (first row)"],
      ["6. Delete the sample data row before adding your data"],
      ["7. Save as .xlsx or .xls format only"],
      [""],
      ["PARENT/GUARDIAN INVITATIONS:"],
      [
        "- If Parent Email is provided, an invitation will be sent automatically",
      ],
      ["- Parent Name is required if Parent Email is provided"],
      ["- Parent Phone is optional but recommended"],
      ["- Parent Relationship should be: FATHER, MOTHER, GUARDIAN, or OTHER"],
      [
        "- Each unique parent email receives only ONE invitation (even for multiple children)",
      ],
      [""],
      ["REQUIRED FIELDS (marked with *):"],
      ["- First Name"],
      ["- Last Name"],
      ["- Gender (must be exactly: MALE, FEMALE, or OTHER)"],
      ["- Date of Birth (format: YYYY-MM-DD, e.g., 2010-01-15)"],
      ["- Admission Date (format: YYYY-MM-DD)"],
      [""],
      ["GENDER VALUES (case-sensitive):"],
      ["- MALE"],
      ["- FEMALE"],
      ["- OTHER"],
      [""],
      ["PARENT RELATIONSHIP VALUES:"],
      ["- FATHER"],
      ["- MOTHER"],
      ["- GUARDIAN"],
      ["- SIBLING"],
      ["- RELATIVE"],
      ["- OTHER"],
      [""],
      ["BLOOD GROUP OPTIONS:"],
      ["A+, A-, B+, B-, AB+, AB-, O+, O-"],
      [""],
      ["AVAILABLE CLASSES:"],
      ...school.classes.map((c) => [`- ${c.name}`]),
      [""],
      ["AVAILABLE DEPARTMENTS:"],
      ...school.departments.map((d) => [`- ${d.name}`]),
      [""],
      ["AVAILABLE HOUSES:"],
      ...school.houses.map((h) => [`- ${h.name}`]),
      [""],
      ["DATE FORMAT EXAMPLES:"],
      ["- 2010-01-15 (January 15, 2010)"],
      ["- 2009-12-25 (December 25, 2009)"],
      [""],
      ["TIPS:"],
      ["1. Use exact class/department/house names as shown above"],
      ["2. Leave optional fields empty if no data available"],
      ["3. Phone numbers can include country code (e.g., +233244123456)"],
      ["4. Double-check all dates are in YYYY-MM-DD format"],
      ["5. Ensure Gender is exactly MALE, FEMALE, or OTHER (uppercase)"],
      [
        "6. Parent Email must be valid - invitations will be sent automatically",
      ],
      ["7. Siblings can share the same Parent Email"],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    // Create reference data sheet
    const referenceData = [
      ["REFERENCE DATA"],
      [""],
      ["Classes"],
      ...school.classes.map((c) => [c.name]),
      [""],
      ["Departments"],
      ...school.departments.map((d) => [d.name]),
      [""],
      ["Houses"],
      ...school.houses.map((h) => [h.name]),
      [""],
      ["Gender Options"],
      ["MALE"],
      ["FEMALE"],
      ["OTHER"],
      [""],
      ["Parent Relationship Options"],
      ["FATHER"],
      ["MOTHER"],
      ["GUARDIAN"],
      ["SIBLING"],
      ["RELATIVE"],
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

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Return file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="students-upload-template-${school.code}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[TEMPLATE_DOWNLOAD] Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
