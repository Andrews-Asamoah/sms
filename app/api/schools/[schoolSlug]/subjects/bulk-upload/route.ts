import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import { z } from "zod";

const rowSchema = z.object({
  Name: z.string().min(1, "Name is required"),
  Code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  Description: z.string().optional(),
  "Department Codes": z.string().min(1, "Department Codes is required"),
  "Periods Per Week": z.number().int().min(1).max(10).default(4),
});

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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: "",
    });

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        id: true,
        departments: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const existingSubjects = await prisma.subject.findMany({
      where: { schoolId: school.id },
      select: { code: true },
    });

    const existingCodes = new Set(existingSubjects.map((s) => s.code.toLowerCase()));

    const results = [];
    const summary = {
      total: rawData.length,
      successful: 0,
      repaired: 0,
      skipped: 0,
      failed: 0,
    };

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any;
      const rowNum = i + 2; // +1 for 0-index, +1 for header

      try {
        // Parse periods to number if it comes as string
        const parsedRow = {
          ...row,
          "Periods Per Week": row["Periods Per Week"] ? parseInt(row["Periods Per Week"], 10) : 4,
        };

        const validatedData = rowSchema.parse(parsedRow);
        
        const name = validatedData.Name;
        const code = validatedData.Code;
        const description = validatedData.Description;
        const departmentCodesStr = validatedData["Department Codes"];
        const periodsPerWeek = validatedData["Periods Per Week"];

        // 1. Skip if Subject Code exists
        if (existingCodes.has(code.toLowerCase())) {
          results.push({
            row: rowNum,
            name,
            code,
            status: "success",
            action: "skipped",
            message: `Subject code '${code}' already exists`,
          });
          summary.skipped++;
          continue;
        }

        // 2. Validate Departments
        // Department Codes is a comma separated string
        const providedCodes = departmentCodesStr
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);

        const departmentIds = [];
        const missingCodes = [];

        for (const providedCode of providedCodes) {
          const dept = school.departments.find(
            (d) =>
              (d.code && d.code.toLowerCase() === providedCode.toLowerCase()) ||
              d.name.toLowerCase() === providedCode.toLowerCase()
          );

          if (dept) {
            departmentIds.push(dept.id);
          } else {
            missingCodes.push(providedCode);
          }
        }

        if (missingCodes.length > 0) {
          results.push({
            row: rowNum,
            name,
            code,
            status: "error",
            message: `Departments not found: ${missingCodes.join(", ")}`,
          });
          summary.failed++;
          continue;
        }
        
        if (departmentIds.length === 0) {
          results.push({
            row: rowNum,
            name,
            code,
            status: "error",
            message: "At least one valid department code is required",
          });
          summary.failed++;
          continue;
        }

        // 3. Create the subject
        await prisma.subject.create({
          data: {
            schoolId: school.id,
            name,
            code,
            description,
            periodsPerWeek,
            isActive: true,
            departments: {
              connect: departmentIds.map((id) => ({ id })),
            },
          }
        });

        existingCodes.add(code.toLowerCase());

        results.push({
          row: rowNum,
          name,
          code,
          status: "success",
          action: "created",
        });
        summary.successful++;
      } catch (error) {
        let message = "Unknown error occurred";
        if (error instanceof z.ZodError) {
          message = error.issues.map((e: any) => e.message).join(", ");
        } else if (error instanceof Error) {
          message = error.message;
        }

        results.push({
          row: rowNum,
          name: row?.Name || "Unknown",
          code: row?.Code || "Unknown",
          status: "error",
          message,
        });
        summary.failed++;
      }
    }

    return NextResponse.json({
      results,
      summary,
    });
  } catch (error) {
    console.error("[Subjects Bulk Upload] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
