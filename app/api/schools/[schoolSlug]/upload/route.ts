import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadFile, extFromMime } from "@/lib/storage/r2";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { schoolSlug } = await params;
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "misc";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const ext = extFromMime(mimeType);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    const key = `${schoolSlug}/files/${folder}/${fileName}`;

    const uploadResult = await uploadFile(buffer, key, mimeType);

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || "Failed to upload file");
    }

    return NextResponse.json({
      url: uploadResult.url,
      key: uploadResult.key,
      success: true,
    });
  } catch (error: any) {
    console.error("[UPLOAD_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
