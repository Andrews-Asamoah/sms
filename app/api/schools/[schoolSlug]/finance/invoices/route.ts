import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

// GET all bills (invoices)
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const classId = searchParams.get("classId");
  const studentId = searchParams.get("studentId");

  const whereClause: any = { schoolId: school.id };
  if (status) whereClause.status = status;
  if (classId) whereClause.student = { classId };
  if (studentId) whereClause.studentId = studentId;

  try {
    const bills = await prisma.bill.findMany({
      where: whereClause,
      include: {
        student: {
          select: { profile: true, class: { select: { name: true } } },
        },
        feeStructure: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bills);
  } catch (error) {
    console.error("Fetch Bills Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}
