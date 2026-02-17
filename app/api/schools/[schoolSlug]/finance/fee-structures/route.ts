import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school)
    return NextResponse.json({ error: "School not found" }, { status: 404 });

  const fees = await prisma.feeStructure.findMany({
    where: { schoolId: school.id },
    include: {
      items: true,
      _count: {
        select: { bills: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(fees);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });
  if (!school)
    return NextResponse.json({ error: "School not found" }, { status: 404 });

  const body = await request.json();
  const {
    name,
    description,
    classLevel,
    items,
    targetClasses,
    targetDepartments,
  } = body;

  // Transaction to create structure and items
  // If targetClasses or targetDepartments is provided, we might auto-generate bills?
  // Usually, Fee Structure is just a template. "Billing" is a separate action.
  // For now, we just create the Structure.
  // But user asked for "create bill items... depending all their classes or department".
  // This implies creating the Fee Structure template first.

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Fee Structure Template
      const feeStructure = await tx.feeStructure.create({
        data: {
          schoolId: school.id,
          name,
          description,
          classLevel,
          items: {
            create: items.map((item: any) => ({
              name: item.name,
              amount: item.amount,
              isOptional: item.isOptional || false,
              description: item.description,
              category: "TUITION", // Default category, can be enhanced
            })),
          },
        },
        include: { items: true },
      });

      // 2. Automate Billing (if targets provided)
      let createdBillsCount = 0;
      if (
        (targetClasses && targetClasses.length > 0) ||
        (targetDepartments && targetDepartments.length > 0)
      ) {
        // Find students in these classes/departments
        const whereClause: any = {
          schoolId: school.id,
          status: "ACTIVE", // Only active students
          OR: [],
        };

        if (targetClasses?.length) {
          whereClause.OR.push({ classId: { in: targetClasses } });
        }
        if (targetDepartments?.length) {
          whereClause.OR.push({ departmentId: { in: targetDepartments } });
        }

        if (whereClause.OR.length === 0) {
          // No valid targets
        } else {
          const studentsToBill = await tx.student.findMany({
            where: whereClause,
            select: { id: true, outstandingBalance: true },
          });

          // Get current Academic Year (assuming active)
          const academicYear = await tx.academicYear.findFirst({
            where: { schoolId: school.id, isCurrent: true },
          });

          if (academicYear && studentsToBill.length > 0) {
            const totalAmount = items.reduce(
              (sum: number, item: any) => sum + Number(item.amount),
              0,
            );

            for (const student of studentsToBill) {
              // Create Bill
              const bill = await tx.bill.create({
                data: {
                  schoolId: school.id,
                  studentId: student.id,
                  academicYearId: academicYear.id,
                  feeStructureId: feeStructure.id,
                  billNumber: `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  totalAmount: totalAmount,
                  balanceAmount: totalAmount,
                  paidAmount: 0,
                  status: "PENDING",
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                  items: {
                    create: feeStructure.items.map((item) => ({
                      description: item.name,
                      amount: item.amount,
                      quantity: 1,
                      totalAmount: item.amount,
                      feeItemId: item.id,
                    })),
                  },
                },
              });

              // Update Student Outstanding Balance
              await tx.student.update({
                where: { id: student.id },
                data: {
                  outstandingBalance: { increment: totalAmount },
                },
              });

              createdBillsCount++;
            }
          }
        }
      }

      return { feeStructure, createdBillsCount };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create Fee Structure Error:", error);
    return NextResponse.json(
      { error: "Failed to create fee structure" },
      { status: 500 },
    );
  }
}
