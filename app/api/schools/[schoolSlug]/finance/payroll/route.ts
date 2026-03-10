import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculatePayrollBreakdown } from "@/lib/finance/payroll-utils";
import { Prisma } from "@/lib/generated/prisma";

/**
 * GET /api/schools/[schoolSlug]/finance/payroll
 * Fetch payroll records for a school
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const payrollRecords = await prisma.payrollRecord.findMany({
      where: { schoolId: school.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        _count: {
          select: { payslips: true },
        },
      },
    });

    return NextResponse.json({ payrollRecords });
  } catch (error) {
    console.error("[PAYROLL_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/schools/[schoolSlug]/finance/payroll
 * Generate payroll for a specific month and year
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { month, year } = await req.json();

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      include: {
        teachers: {
          where: { isActive: true },
          select: { id: true, monthlySalary: true },
        },
        staff: {
          where: { isActive: true },
          select: { id: true, monthlySalary: true },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check if payroll already exists for this period
    const existing = await prisma.payrollRecord.findUnique({
      where: {
        schoolId_month_year: {
          schoolId: school.id,
          month,
          year,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Payroll already exists for this period" },
        { status: 400 },
      );
    }

    // Prepare calculations for all staff and teachers
    const allStaff = [
      ...school.teachers.map((t) => ({ ...t, type: "teacher" as const })),
      ...school.staff.map((s) => ({ ...s, type: "staff" as const })),
    ];

    const payslipData = allStaff.map((member) => {
      const basicSalary = Number(member.monthlySalary || 0);
      const breakdown = calculatePayrollBreakdown(basicSalary);

      return {
        schoolId: school.id,
        teacherId: member.type === "teacher" ? member.id : null,
        staffId: member.type === "staff" ? member.id : null,
        basicSalary: breakdown.basicSalary,
        allowances: breakdown.allowances,
        grossSalary: breakdown.grossSalary,
        ssnitEmployee: breakdown.ssnitEmployee,
        ssnitEmployer: breakdown.ssnitEmployer,
        incomeTax: breakdown.incomeTax,
        otherDeductions: breakdown.otherDeductions,
        netSalary: breakdown.netSalary,
      };
    });

    // Aggregate totals for the record
    const totalGross = payslipData.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalNet = payslipData.reduce((sum, p) => sum + p.netSalary, 0);
    const totalTax = payslipData.reduce((sum, p) => sum + p.incomeTax, 0);
    const totalSSNIT = payslipData.reduce(
      (sum, p) => sum + p.ssnitEmployee + p.ssnitEmployer,
      0,
    );

    // Create record and slips in an atomic transaction
    const payrollRecord = await prisma.$transaction(async (tx) => {
      const record = await tx.payrollRecord.create({
        data: {
          schoolId: school.id,
          month,
          year,
          status: "DRAFT",
          totalGross: new Prisma.Decimal(totalGross),
          totalNet: new Prisma.Decimal(totalNet),
          totalTax: new Prisma.Decimal(totalTax),
          totalSSNIT: new Prisma.Decimal(totalSSNIT),
          processedById: session.user.id,
          payslips: {
            create: payslipData.map((p) => ({
              ...p,
              basicSalary: new Prisma.Decimal(p.basicSalary),
              allowances: new Prisma.Decimal(p.allowances),
              grossSalary: new Prisma.Decimal(p.grossSalary),
              ssnitEmployee: new Prisma.Decimal(p.ssnitEmployee),
              ssnitEmployer: new Prisma.Decimal(p.ssnitEmployer),
              incomeTax: new Prisma.Decimal(p.incomeTax),
              otherDeductions: new Prisma.Decimal(p.otherDeductions),
              netSalary: new Prisma.Decimal(p.netSalary),
            })),
          },
        },
        include: {
          _count: {
            select: { payslips: true },
          },
        },
      });
      return record;
    });

    return NextResponse.json({ payrollRecord }, { status: 201 });
  } catch (error) {
    console.error("[PAYROLL_POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
