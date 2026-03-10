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

  try {
    const url = new URL(request.url);
    const academicYearId = url.searchParams.get("academicYearId");
    const termId = url.searchParams.get("termId");

    // Read Working Context from cookies
    const cookieStore = await import("next/headers").then(mod => mod.cookies());
    const workingYearId = (await cookieStore).get(`sms_working_year_${schoolSlug}`)?.value;
    const workingTermId = (await cookieStore).get(`sms_working_term_${schoolSlug}`)?.value;

    const schoolWithSettings = await prisma.school.findUnique({
      where: { id: school.id },
      select: { settings: true },
    });
    const settings = (schoolWithSettings?.settings as any) || {};
    
    // Priority: 1. Query Param, 2. Working Context (Cookie), 3. School Default
    const effectiveYearId = academicYearId === "all" ? undefined : (academicYearId || workingYearId || settings.currentAcademicYearId);
    const effectiveTermId = termId === "all" ? undefined : (termId || workingTermId || settings.currentTermId);

    const where: any = { schoolId: school.id };
    if (effectiveYearId) where.academicYearId = effectiveYearId;
    if (effectiveTermId) where.termId = effectiveTermId;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        customCategory: { select: { name: true, code: true } },
        registryCategory: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Fetch Expenses Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 },
    );
  }
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

  try {
    const body = await request.json();
    const {
      amount,
      date,
      description,
      customCategoryId,
      registryCategoryId,
      payee,
      paymentMethod,
      referenceNumber,
      voucherNumber,
      notes,
    } = body;

    if (!amount || !date || !description) {
      return NextResponse.json(
        { error: "Amount, date, and description are required." },
        { status: 400 },
      );
    }

    // Get Working Context from cookies or settings
    const cookieStore = await import("next/headers").then(mod => mod.cookies());
    const workingYearId = (await cookieStore).get("sms_working_academic_year_id")?.value;
    const workingTermId = (await cookieStore).get("sms_working_term_id")?.value;

    const schoolWithSettings = await prisma.school.findUnique({
      where: { id: school.id },
      select: { settings: true },
    });
    const settings = (schoolWithSettings?.settings as any) || {};

    const expense = await prisma.expense.create({
      data: {
        schoolId: school.id,
        amount: parseFloat(amount),
        date: new Date(date),
        description,
        customCategoryId: customCategoryId || null,
        registryCategoryId: registryCategoryId || null,
        payee: payee || null,
        paymentMethod: paymentMethod || "CASH",
        referenceNumber: referenceNumber || null,
        voucherNumber: voucherNumber || null,
        recordedById: session.user.id,
        academicYearId: workingYearId || settings.currentAcademicYearId,
        termId: workingTermId || settings.currentTermId,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Create Expense Error:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 },
    );
  }
}
