import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

export async function POST(
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
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const items = await prisma.inventoryTransaction.findMany({
      where: { schoolId: school.id },
      include: {
        item: true,
        performedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Fetch Inventory Transactions Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory transactions" },
      { status: 500 },
    );
  }
}
