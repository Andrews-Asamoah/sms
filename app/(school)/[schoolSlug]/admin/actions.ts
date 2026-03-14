"use server";

import prisma from "@/lib/prisma";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";
import { formatStudentName } from "@/lib/utils/name-formatter";

export async function getAdminDashboardStats(schoolSlug: string) {
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      _count: {
        select: {
          teachers: { where: { isActive: true } },
          staff: { where: { isActive: true } },
          classes: { where: { isActive: true } },
        },
      },
    },
  });

  if (!school) throw new Error("School not found");

  const { currentAcademicYearId, currentTermId } =
    (school.settings as any) || {};

  // Get active student count based on enrollments in current term/year
  const activeStudentCount = await prisma.student.count({
    where: {
      schoolId: school.id,
      status: "ACTIVE",
      enrollments: {
        some: {
          academicYearId: currentAcademicYearId || undefined,
          termId: currentTermId || undefined,
          status: "ACTIVE",
        },
      },
    },
  });

  // Fetch Financial Totals (Revenue vs Expenses)
  const bills = await prisma.bill.findMany({
    where: {
      schoolId: school.id,
      academicYearId: currentAcademicYearId || undefined,
      termId: currentTermId || undefined,
    },
    select: {
      paidAmount: true,
    },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      schoolId: school.id,
      academicYearId: currentAcademicYearId || undefined,
      termId: currentTermId || undefined,
    },
    select: {
      amount: true,
    },
  });

  const totalRevenue = bills.reduce((sum, b) => sum + Number(b.paidAmount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Fetch Enrollment Data for Charts (Last 6 Months) - NEW students per month
  const enrollmentTrends = await Promise.all(
    Array.from({ length: 6 }).map(async (_, i) => {
      const monthDate = subMonths(new Date(), 5 - i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      const count = await prisma.student.count({
        where: {
          schoolId: school.id,
          admissionDate: {
            gte: start,
            lte: end,
          },
        },
      });

      return {
        month: monthDate.toLocaleString("default", { month: "short" }),
        students: count,
      };
    }),
  );

  // Financial Chart Data (Revenue vs Expenses)
  const financialData = [
    { name: "Revenue", value: totalRevenue, fill: "var(--color-revenue)" },
    {
      name: "Expenses",
      value: totalExpenses,
      fill: "var(--color-expenses)",
    },
  ];

  // Gender Distribution Charts
  const genderDistribution = await Promise.all([
    prisma.student.count({
      where: {
        schoolId: school.id,
        status: "ACTIVE",
        profile: { gender: "MALE" },
        enrollments: {
          some: {
            academicYearId: currentAcademicYearId || undefined,
            status: "ACTIVE",
          },
        },
      },
    }),
    prisma.student.count({
      where: {
        schoolId: school.id,
        status: "ACTIVE",
        profile: { gender: "FEMALE" },
        enrollments: {
          some: {
            academicYearId: currentAcademicYearId || undefined,
            status: "ACTIVE",
          },
        },
      },
    }),
  ]).then(([male, female]) => [
    { gender: "male", count: male, fill: "var(--color-male)" },
    { gender: "female", count: female, fill: "var(--color-female)" },
  ]);

  // Recent Activities (Latest 5 students)
  const recentStudents = await prisma.student.findMany({
    where: { schoolId: school.id },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      profile: true,
      class: true,
    },
  });

  return {
    schoolName: school.name,
    currency: school.currency,
    counts: {
      students: activeStudentCount,
      teachers: school._count.teachers,
      staff: school._count.staff,
      classes: school._count.classes,
    },
    financials: {
      totalRevenue,
      totalExpenses,
      chartData: financialData,
    },
    enrollmentTrends,
    genderDistribution,
    recentActivities: recentStudents.map((s) => ({
      id: s.id,
      title: "New Student Enrolled",
      description: `${formatStudentName(s.profile.firstName, s.profile.lastName, s.profile.otherNames)} joined ${s.class?.name || "N/A"}`,
      time: s.createdAt,
    })),
  };
}
