// app/api/schools/check-availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const subdomain = searchParams.get("subdomain");

    if (!code && !subdomain) {
      return NextResponse.json(
        {
          success: false,
          error: "Either code or subdomain parameter is required",
        },
        { status: 400 }
      );
    }

    // Check school code availability
    if (code) {
      const existingSchool = await prisma.school.findFirst({
        where: { code: code.toUpperCase() },
        select: { id: true, name: true, code: true },
      });

      if (existingSchool) {
        return NextResponse.json({
          success: true,
          available: false,
          field: "code",
          message: `Code already used by ${existingSchool.name}`,
          existing: existingSchool,
        });
      }

      return NextResponse.json({
        success: true,
        available: true,
        field: "code",
        message: "Code is available",
      });
    }

    // Check subdomain availability
    if (subdomain) {
      // Check in School table
      const existingSchool = await prisma.school.findFirst({
        where: { subdomain: subdomain.toLowerCase() },
        select: { id: true, name: true, subdomain: true },
      });

      if (existingSchool) {
        return NextResponse.json({
          success: true,
          available: false,
          field: "subdomain",
          message: `Subdomain already used by ${existingSchool.name}`,
          existing: existingSchool,
        });
      }

      // Also check in Organization table (Better Auth)
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: subdomain.toLowerCase() },
        select: { id: true, name: true, slug: true },
      });

      if (existingOrg) {
        return NextResponse.json({
          success: true,
          available: false,
          field: "subdomain",
          message: `Subdomain already used by ${existingOrg.name}`,
          existing: existingOrg,
        });
      }

      return NextResponse.json({
        success: true,
        available: true,
        field: "subdomain",
        message: "Subdomain is available",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid parameters",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("[CHECK_AVAILABILITY] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check availability",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
