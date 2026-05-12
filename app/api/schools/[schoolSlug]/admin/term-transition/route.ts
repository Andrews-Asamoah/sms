import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { Prisma } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role || (role.effectiveRole !== "admin" && role.effectiveRole !== "owner" && !session.isSuperAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const { newAcademicYearId, newTermId, carryForwardBalances } = await req.json();

    if (!newAcademicYearId) {
      return NextResponse.json({ error: "New Academic Year ID is required" }, { status: 400 });
    }

    // Verify the new academic year and term belong to this school
    const newAcademicYear = await prisma.academicYear.findFirst({
      where: { id: newAcademicYearId, schoolId: school.id }
    });
    
    if (!newAcademicYear) {
      return NextResponse.json({ error: "Academic Year not found" }, { status: 404 });
    }

    let newTerm = null;
    if (newTermId) {
      newTerm = await prisma.term.findFirst({
        where: { id: newTermId, academicYearId: newAcademicYearId }
      });
      if (!newTerm) {
        return NextResponse.json({ error: "Term not found" }, { status: 404 });
      }
    }

    // Begin transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Unset current for all academic years and terms
      await tx.academicYear.updateMany({
        where: { schoolId: school.id, isCurrent: true },
        data: { isCurrent: false }
      });

      await tx.term.updateMany({
        where: { academicYear: { schoolId: school.id }, isCurrent: true },
        data: { isCurrent: false }
      });

      // 2. Set new current academic year
      await tx.academicYear.update({
        where: { id: newAcademicYearId },
        data: { isCurrent: true }
      });

      // 3. Set new current term if provided
      if (newTermId) {
        await tx.term.update({
          where: { id: newTermId },
          data: { isCurrent: true }
        });
      }

      // 4. Carry forward balances
      let arrearsCreated = 0;
      if (carryForwardBalances) {
        // Find students with positive outstanding balance
        const studentsWithArrears = await tx.student.findMany({
          where: { 
            schoolId: school.id, 
            status: "ACTIVE",
            outstandingBalance: { gt: 0 }
          }
        });

        for (const student of studentsWithArrears) {
          // Generate a unique bill number
          const count = await tx.bill.count({ where: { schoolId: school.id } });
          const billNumber = `ARR-${school.id.substring(0, 4)}-${new Date().getTime()}-${count + 1}`;

          // Create an arrears bill
          const bill = await tx.bill.create({
            data: {
              schoolId: school.id,
              studentId: student.id,
              academicYearId: newAcademicYearId,
              termId: newTermId || null,
              billNumber,
              totalAmount: student.outstandingBalance,
              balanceAmount: student.outstandingBalance,
              status: "PENDING",
              notes: "Arrears brought forward from previous term(s)",
            }
          });

          // Create the bill item
          await tx.billItem.create({
            data: {
              billId: bill.id,
              description: "Previous Balance (Arrears)",
              amount: student.outstandingBalance,
              totalAmount: student.outstandingBalance,
              balanceAmount: student.outstandingBalance,
              status: "UNPAID"
            }
          });

          arrearsCreated++;
        }
      }

      // Log the action
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityType: "System",
          entityId: "TermTransition",
          newValues: {
            newAcademicYearId,
            newTermId,
            carryForwardBalances
          } as Prisma.InputJsonValue
        }
      });

      return { arrearsCreated };
    }, {
      timeout: 15000 // Give it a bit more time for processing
    });

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error("[TERM_TRANSITION]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
