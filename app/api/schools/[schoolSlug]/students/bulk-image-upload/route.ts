// app/api/schools/[schoolSlug]/students/bulk-image-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { replaceFile, extractKeyFromUrl, r2Keys } from "@/lib/storage/r2";
import { validateImageFile, fileToBuffer } from "@/lib/storage/validate";
import sharp from "sharp";

/**
 * POST /api/schools/[schoolSlug]/students/bulk-image-upload
 *
 * Accepts a multipart form with multiple image files.
 * Each file must be named after the student's studentId or admissionNumber
 * (e.g. "STU-26-0001.jpg" or "260001.png").
 *
 * For each file the handler:
 *  1. Normalises the filename key (strips extension)
 *  2. Looks up the student by studentId OR admissionNumber
 *  3. Optimises the image with sharp (400×400 WebP)
 *  4. Uploads to R2, replacing any previous image
 *  5. Updates user.image in the DB
 *
 * Returns a summary of matched, skipped, and failed files.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  const isAuthorized =
    session.isSuperAdmin ||
    role?.effectiveRole === "owner" ||
    role?.effectiveRole === "admin";

  if (!isAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, subdomain: true },
  });

  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form data" },
      { status: 400 },
    );
  }

  const results: {
    filename: string;
    status: "ok" | "not_found" | "invalid" | "error";
    studentId?: string;
    reason?: string;
  }[] = [];

  for (const [fieldName, value] of formData.entries()) {
    if (!(value instanceof File)) continue;

    const file = value;
    // The field name IS the filename for drag-and-drop scenarios; fall back to file.name
    const rawName = fieldName !== "images" ? fieldName : file.name;
    const lookupKey = rawName.replace(/\.[^.]+$/, "").trim(); // strip extension

    // 1. Validate
    const validation = validateImageFile(file);
    if (!validation.valid) {
      results.push({
        filename: rawName,
        status: "invalid",
        reason: validation.error,
      });
      continue;
    }

    // 2. Find student by studentId or admissionNumber
    const student = await prisma.student.findFirst({
      where: {
        schoolId: school.id,
        OR: [{ studentId: lookupKey }, { admissionNumber: lookupKey }],
      },
      select: {
        id: true,
        studentId: true,
        profile: { select: { user: { select: { id: true, image: true } } } },
      },
    });

    if (!student || !student.profile?.user?.id) {
      results.push({
        filename: rawName,
        status: "not_found",
        reason: `No student matched "${lookupKey}"`,
      });
      continue;
    }

    const userId = student.profile.user.id;
    const currentImage = student.profile.user.image;

    // 3. Optimise with sharp
    try {
      const raw = await fileToBuffer(file);
      const optimised = await sharp(raw)
        .resize(400, 400, { fit: "cover", position: "attention" })
        .webp({ quality: 80 })
        .toBuffer();

      const key = r2Keys.studentImage(school.subdomain, userId, "webp");
      const upload = await replaceFile(
        optimised,
        key,
        "image/webp",
        currentImage,
      );

      if (!upload.success) {
        results.push({
          filename: rawName,
          status: "error",
          studentId: student.studentId,
          reason: upload.error,
        });
        continue;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { image: upload.url },
      });
      results.push({
        filename: rawName,
        status: "ok",
        studentId: student.studentId,
      });
    } catch (err) {
      results.push({
        filename: rawName,
        status: "error",
        studentId: student.studentId,
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const summary = {
    total: results.length,
    matched: results.filter((r) => r.status === "ok").length,
    notFound: results.filter((r) => r.status === "not_found").length,
    invalid: results.filter((r) => r.status === "invalid").length,
    errors: results.filter((r) => r.status === "error").length,
  };

  return NextResponse.json({ summary, results });
}
