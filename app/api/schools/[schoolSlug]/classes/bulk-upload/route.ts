// app/api/schools/[schoolSlug]/classes/bulk-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import { z } from "zod";
import { slugify } from "@/lib/utils";

interface SchoolSettings {
  currentAcademicYearId?: string | null;
  [key: string]: unknown;
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
      select: { id: true, settings: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const { currentAcademicYearId } = (school.settings as unknown as SchoolSettings) ?? {};

    if (!currentAcademicYearId) {
      return NextResponse.json(
        { error: "No active academic year configured. Please configure it in settings." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read the data, treating headers properly
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: "",
      raw: false, // Ensure dates/numbers are parsed as strings
    });

    if (rawData.length === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // Fetch reference data
    const [departments, teachers, existingClasses] = await Promise.all([
      prisma.department.findMany({ where: { schoolId: school.id, isActive: true } }),
      prisma.teacher.findMany({ where: { schoolId: school.id, isActive: true } }),
      prisma.class.findMany({ where: { schoolId: school.id, academicYearId: currentAcademicYearId } }),
    ]);

    const results = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    let repaired = 0;

    for (let i = 0; i < rawData.length; i++) {
      const rowNum = i + 2; // +1 for 0-index, +1 for header
      const row = rawData[i];

      // Normalize keys by trimming and removing *
      const normalizedRow: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key.replace("*", "").trim().toLowerCase();
        normalizedRow[cleanKey] = typeof value === 'string' ? value.trim() : String(value);
      }

      const name = normalizedRow["name"];
      const level = normalizedRow["level"];
      const capacityStr = normalizedRow["capacity"];
      const teacherId = normalizedRow["class teacher id"];
      const deptName = normalizedRow["department name"];
      const isGraduatingStr = normalizedRow["graduating class (yes/no)"];
      const orderStr = normalizedRow["order"];

      if (!name || !level) {
        results.push({
          row: rowNum,
          name: name || "Unknown",
          level: level || "Unknown",
          status: "error",
          message: "Name and Level are required fields.",
        });
        failed++;
        continue;
      }

      // Check if class already exists in this academic year
      const existingClass = existingClasses.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (existingClass) {
        results.push({
          row: rowNum,
          name,
          level,
          status: "success",
          action: "skipped",
          message: "Class already exists in the current academic year.",
        });
        skipped++;
        continue;
      }

      // Department resolution
      let departmentId = null;
      if (deptName) {
        const dept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
        if (dept) {
          departmentId = dept.id;
        } else {
          results.push({
            row: rowNum,
            name,
            level,
            status: "error",
            message: `Department '${deptName}' not found.`,
          });
          failed++;
          continue;
        }
      }

      // Teacher resolution
      let classTeacherId = null;
      if (teacherId) {
        const teacher = teachers.find(t => t.teacherId === teacherId);
        if (teacher) {
          classTeacherId = teacher.id;
        } else {
          results.push({
            row: rowNum,
            name,
            level,
            status: "error",
            message: `Teacher with ID '${teacherId}' not found.`,
          });
          failed++;
          continue;
        }
      }

      const capacity = capacityStr ? parseInt(capacityStr, 10) : null;
      const order = orderStr ? parseInt(orderStr, 10) : null;
      const isGraduatingClass = isGraduatingStr?.toUpperCase() === "YES";

      try {
        await prisma.class.create({
          data: {
            schoolId: school.id,
            academicYearId: currentAcademicYearId,
            name,
            slug: slugify(name),
            level,
            capacity: isNaN(capacity as any) ? null : capacity,
            classTeacherId,
            departmentId,
            isGraduatingClass,
            order: isNaN(order as any) ? null : order,
            isActive: true,
          }
        });

        results.push({
          row: rowNum,
          name,
          level,
          status: "success",
          action: "created",
        });
        successful++;
      } catch (error: any) {
        results.push({
          row: rowNum,
          name,
          level,
          status: "error",
          message: error.message || "Failed to create class",
        });
        failed++;
      }
    }

    return NextResponse.json({
      results,
      summary: {
        total: rawData.length,
        successful,
        repaired,
        skipped,
        failed,
      },
    });

  } catch (error) {
    console.error("[Classes Bulk Upload] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
