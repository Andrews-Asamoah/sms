"use server";

import prisma from "@/lib/prisma";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

export async function getAdminDashboardStats(schoolSlug: string) {
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      _count: {
        select: {
          students: { where: { status: "ACTIVE" } },
          teachers: { where: { isActive: true } },
          staff: { where: { isActive: true } },
          classes: { where: { isActive: true } },
        },
      },
    },
  });

  if (!school) throw new Error("School not found");

  // Fetch Financial Totals
  const bills = await prisma.bill.findMany({
    where: { schoolId: school.id },
    select: {
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
    },
  });

  const totalRevenue = bills.reduce((sum, b) => sum + Number(b.paidAmount), 0);
  const totalOutstanding = bills.reduce(
    (sum, b) => sum + Number(b.balanceAmount),
    0,
  );

  // Fetch Enrollment Data for Charts (Last 6 Months)
  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

  const enrollmentTrends = await Promise.all(
    Array.from({ length: 6 }).map(async (_, i) => {
      const monthDate = subMonths(new Date(), 5 - i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      const count = await prisma.student.count({
        where: {
          schoolId: school.id,
          admissionDate: {
            lte: end,
          },
          status: "ACTIVE",
        },
      });

      return {
        month: monthDate.toLocaleString("default", { month: "short" }),
        students: count,
      };
    }),
  );

  // Financial Chart Data (Revenue vs Outstanding)
  const financialData = [
    { name: "Collected", value: totalRevenue, fill: "var(--color-revenue)" },
    {
      name: "Outstanding",
      value: totalOutstanding,
      fill: "var(--color-outstanding)",
    },
  ];

  // Gender Distribution Charts
  const genderDistribution = await Promise.all([
    prisma.student.count({
      where: {
        schoolId: school.id,
        status: "ACTIVE",
        profile: { gender: "MALE" },
      },
    }),
    prisma.student.count({
      where: {
        schoolId: school.id,
        status: "ACTIVE",
        profile: { gender: "FEMALE" },
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
      students: school._count.students,
      teachers: school._count.teachers,
      staff: school._count.staff,
      classes: school._count.classes,
    },
    financials: {
      totalRevenue,
      totalOutstanding,
      chartData: financialData,
    },
    enrollmentTrends,
    genderDistribution,
    recentActivities: recentStudents.map((s) => ({
      id: s.id,
      title: "New Student Enrolled",
      description: `${s.profile.firstName} ${s.profile.lastName} joined ${s.class?.name || "N/A"}`,
      time: s.createdAt,
    })),
  };
}
