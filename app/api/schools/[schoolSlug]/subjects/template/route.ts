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
      select: {
        code: true,
        departments: {
          where: { isActive: true },
          select: { name: true, code: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const workbook = XLSX.utils.book_new();

    const headers = [
      "Name*",
      "Code*",
      "Description",
      "Department Codes*",
      "Periods Per Week*",
    ];

    const sampleRow = [
      "General Mathematics",
      "MAT101",
      "Core mathematics curriculum",
      school.departments[0]?.code ?? "SCI",
      "4",
    ];

    const dataSheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

    dataSheet["!cols"] = [
      { wch: 30 }, // Name
      { wch: 15 }, // Code
      { wch: 40 }, // Description
      { wch: 25 }, // Department Codes
      { wch: 15 }, // Periods Per Week
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, "Subjects");

    const instructionsData = [
      ["SUBJECTS BULK UPLOAD TEMPLATE — INSTRUCTIONS"],
      [""],
      ["IMPORTANT NOTES:"],
      ["1. Fields marked with * are REQUIRED."],
      ["2. Keep the header row exactly as it is (row 1)."],
      ["3. Delete the sample data row before uploading your real data."],
      ["4. Save the file in .xlsx or .xls format only."],
      [""],
      ["REQUIRED FIELDS (marked with *):"],
      ["  • Name (e.g., General Science, English Language)"],
      ["  • Code (e.g., SCI101, ENG201) - Must be unique and max 10 characters"],
      ["  • Department Codes (e.g., SCI, MAT). Use comma-separated codes for multiple departments."],
      ["  • Periods Per Week (e.g., 4) - Must be a number between 1 and 10"],
      [""],
      ["OPTIONAL FIELDS:"],
      ["  • Description: A brief description of the subject curriculum"],
      [""],
      ["AVAILABLE DEPARTMENT CODES:"],
      ...(school.departments.length > 0
        ? school.departments.map((d) => [`  • ${d.code || d.name} (${d.name})`])
        : [["  (No active departments found)"]]),
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet["!cols"] = [{ wch: 90 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileLabel = school.code || schoolSlug;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="subjects-upload-template-${fileLabel}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Subjects Template Download] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
