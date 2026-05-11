import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { getActiveContext } from "@/lib/academic/get-active-context";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, currency: true, settings: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryYearId = searchParams.get("academicYearId");
    const queryTermId = searchParams.get("termId");

    // Resolve user-scoped working context (cookie override → global setting)
    const ctx = await getActiveContext(
      schoolSlug,
      session.user.id,
      school.settings as Record<string, string | undefined>,
      { withNames: false },
    );

    // Allow explicit "all" query param to override the context filter
    let currentAcademicYearId: string | undefined;
    if (queryYearId === "all") {
      currentAcademicYearId = undefined;
    } else {
      currentAcademicYearId = queryYearId || ctx.academicYearId;
    }

    let currentTermId: string | undefined;
    if (queryTermId === "all") {
      currentTermId = undefined;
    } else {
      currentTermId = queryTermId || ctx.termId;
    }

    // Fetch current year/term names for display in the dashboard
    const [currentYear, currentTerm] = await Promise.all([
      currentAcademicYearId
        ? prisma.academicYear.findUnique({
            where: { id: currentAcademicYearId },
            select: { name: true },
          })
        : null,
      currentTermId
        ? prisma.term.findUnique({
            where: { id: currentTermId },
            select: { name: true },
          })
        : null,
    ]);

    // 1. Total Revenue (Completed payments linked to bills in the current period)
    const totalRevenue = await prisma.payment.aggregate({
      where: {
        schoolId: school.id,
        status: "COMPLETED",
        ...(currentAcademicYearId && {
          bill: {
            academicYearId: currentAcademicYearId,
            ...(currentTermId && { termId: currentTermId }),
          },
        }),
      },
      _sum: {
        amount: true,
      },
    });

    // 2. Outstanding Fees (Bills not fully paid in the current period)
    const outstandingFees = await prisma.bill.aggregate({
      where: {
        schoolId: school.id,
        status: { not: "PAID" },
        ...(currentAcademicYearId && { academicYearId: currentAcademicYearId }),
        ...(currentTermId && { termId: currentTermId }),
      },
      _sum: {
        balanceAmount: true,
      },
    });

    // 3. Total Expenses for current period
    const totalExpenses = await prisma.expense.aggregate({
      where: {
        schoolId: school.id,
        ...(currentAcademicYearId && { academicYearId: currentAcademicYearId }),
        ...(currentTermId && { termId: currentTermId }),
      },
      _sum: {
        amount: true,
      },
    });

    // 4. Total Payroll — scoped to the active academic period
    const totalPayroll = await prisma.payrollRecord.aggregate({
      where: {
        schoolId: school.id,
        ...(currentAcademicYearId && { academicYearId: currentAcademicYearId }),
        ...(currentTermId && { termId: currentTermId }),
      },
      _sum: {
        totalGross: true,
        totalNet: true,
      },
    });

    // 5. Recent expenses in current period
    const recentExpenses = await prisma.expense.findMany({
      where: {
        schoolId: school.id,
        ...(currentAcademicYearId && { academicYearId: currentAcademicYearId }),
        ...(currentTermId && { termId: currentTermId }),
      },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        recordedBy: { select: { name: true } },
      },
    });

    // 5. Categorized Revenue Breakdown
    // We get all payment items for this period and group by their FeeItem's registryCategory
    const categorizedRevenueRaw = await prisma.paymentItem.findMany({
      where: {
        payment: {
          schoolId: school.id,
          status: "COMPLETED",
        },
        billItem: {
          bill: {
            ...(currentAcademicYearId && {
              academicYearId: currentAcademicYearId,
            }),
            ...(currentTermId && { termId: currentTermId }),
          },
        },
      },
      select: {
        amount: true,
        billItem: {
          select: {
            feeItem: {
              select: {
                registryItem: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const revenueByCategory: Record<string, number> = {};
    categorizedRevenueRaw.forEach((item) => {
      const categoryName =
        item.billItem.feeItem?.registryItem?.name || "Uncategorized Income";
      revenueByCategory[categoryName] =
        (revenueByCategory[categoryName] || 0) + Number(item.amount);
    });

    const revenueBreakdown = Object.entries(revenueByCategory)
      .map(([name, amount]) => ({
        name,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 6. Categorized Expense Breakdown
    const categorizedExpensesRaw = await prisma.expense.groupBy({
      by: ["registryCategoryId"],
      where: {
        schoolId: school.id,
        ...(currentAcademicYearId && { academicYearId: currentAcademicYearId }),
        ...(currentTermId && { termId: currentTermId }),
      },
      _sum: { amount: true },
    });

    const registryCategories =
      await prisma.expenditureCategoryRegistry.findMany({
        where: {
          id: {
            in: categorizedExpensesRaw
              .map((e) => e.registryCategoryId)
              .filter(Boolean) as string[],
          },
        },
        select: { id: true, name: true },
      });

    const expenseBreakdown = categorizedExpensesRaw
      .map((exp) => {
        const category = registryCategories.find(
          (c) => c.id === exp.registryCategoryId,
        );
        return {
          name: category?.name || "Uncategorized Expense",
          amount: Number(exp._sum.amount || 0),
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      currency: school.currency,
      currentYearName: currentYear?.name ?? null,
      currentTermName: currentTerm?.name ?? null,
      revenue: totalRevenue._sum.amount ? Number(totalRevenue._sum.amount) : 0,
      outstanding: outstandingFees._sum.balanceAmount
        ? Number(outstandingFees._sum.balanceAmount)
        : 0,
      expenses: totalExpenses._sum.amount
        ? Number(totalExpenses._sum.amount)
        : 0,
      payroll: {
        gross: totalPayroll._sum.totalGross
          ? Number(totalPayroll._sum.totalGross)
          : 0,
        net: totalPayroll._sum.totalNet
          ? Number(totalPayroll._sum.totalNet)
          : 0,
      },
      revenueBreakdown,
      expenseBreakdown,
      recentTransactions: recentExpenses,
    });
  } catch (error) {
    console.error("Finance Overview Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
