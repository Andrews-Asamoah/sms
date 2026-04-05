import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ reason: null }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { members: true },
    });

    if (!user) {
      return NextResponse.json({ reason: null });
    }

    if (user.banned && user.banReason) {
      return NextResponse.json({ reason: user.banReason });
    }

    const bannedMember = user.members.find(m => m.banned && m.banReason);
    if (bannedMember) {
      return NextResponse.json({ reason: bannedMember.banReason });
    }

    return NextResponse.json({ reason: null });
  } catch (error) {
    console.error("Failed to fetch ban reason:", error);
    return NextResponse.json({ reason: null }, { status: 500 });
  }
}
