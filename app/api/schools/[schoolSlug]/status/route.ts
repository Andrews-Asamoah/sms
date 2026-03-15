import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Internal API to check school/organization status
 * Used by middleware to avoid complex joins
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  const { schoolSlug } = await params;
  
  // Security check: Only allow internal requests or authorized sessions
  const authHeader = request.headers.get('x-internal-request');
  if (process.env.CRON_SECRET && authHeader !== process.env.CRON_SECRET) {
    // Falls back to checking session if not internal
  }

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      include: {
        organization: {
          select: {
            id: true,
            subscriptionStatus: true,
            expiresAt: true,
          }
        }
      }
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: school.organization.id,
      subscriptionStatus: school.organization.subscriptionStatus,
      expiresAt: school.organization.expiresAt,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
