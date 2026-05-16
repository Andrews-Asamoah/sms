// app/api/schools/[schoolSlug]/classes/template/route.ts

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
          select: { name: true },
          orderBy: { name: "asc" },
        },
        teachers: {
          where: { isActive: true },
          select: { teacherId: true, profile: { select: { firstName: true, lastName: true } } },
          orderBy: { teacherId: "asc" },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const workbook = XLSX.utils.book_new();

    const headers = [
      "Name*",
      "Level*",
      "Capacity",
      "Class Teacher ID",
      "Department Name",
      "Graduating Class (YES/NO)",
      "Order",
    ];

    const sampleRow = [
      "Basic 1A",
      "Primary",
      "40",
      school.teachers[0]?.teacherId ?? "",
      school.departments[0]?.name ?? "",
      "NO",
      "1",
    ];

    const dataSheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

    dataSheet["!cols"] = [
      { wch: 20 }, // Name
      { wch: 15 }, // Level
      { wch: 10 }, // Capacity
      { wch: 20 }, // Class Teacher ID
      { wch: 20 }, // Department Name
      { wch: 25 }, // Graduating Class
      { wch: 10 }, // Order
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, "Classes");

    const instructionsData = [
      ["CLASSES BULK UPLOAD TEMPLATE — INSTRUCTIONS"],
      [""],
      ["IMPORTANT NOTES:"],
      ["1. Fields marked with * are REQUIRED."],
      ["2. Keep the header row exactly as it is (row 1)."],
      ["3. Delete the sample data row before uploading your real data."],
      ["4. Save the file in .xlsx or .xls format only."],
      [""],
      ["REQUIRED FIELDS (marked with *):"],
      ["  • Name (e.g., Basic 1A, JHS 2B)"],
      ["  • Level (e.g., Primary, JHS, SHS, Pre-school)"],
      [""],
      ["OPTIONAL FIELDS:"],
      ["  • Capacity: Maximum number of students for the class"],
      ["  • Class Teacher ID: The Teacher ID (e.g., TCH-2025-001) of the assigned teacher"],
      ["  • Department Name: Must match exactly one of the active departments"],
      ["  • Graduating Class: YES or NO. Indicates if it's a final year class."],
      ["  • Order: A number to sort classes correctly in lists (e.g., 1 for Basic 1, 2 for Basic 2)"],
      [""],
      ["AVAILABLE DEPARTMENTS:"],
      ...(school.departments.length > 0
        ? school.departments.map((d) => [`  • ${d.name}`])
        : [["  (No active departments found)"]]),
      [""],
      ["AVAILABLE TEACHERS:"],
      ...(school.teachers.length > 0
        ? school.teachers.map((t) => [`  • ${t.teacherId} (${t.profile?.firstName} ${t.profile?.lastName})`])
        : [["  (No active teachers found)"]]),
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet["!cols"] = [{ wch: 85 }];
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
        "Content-Disposition": `attachment; filename="classes-upload-template-${fileLabel}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Classes Template Download] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
