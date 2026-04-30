import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSystemGradingSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less")
    .optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  gradeScales: z
    .array(
      z.object({
        grade: z.string().min(1),
        description: z.string().min(1),
        minScore: z.number().min(0).max(100),
        maxScore: z.number().min(0).max(100),
        gradePoint: z.number().min(0),
        displayOrder: z.number(),
      }),
    )
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ gradingId: string }> },
) {
  try {
    await requireSuperAdmin();
    const { gradingId } = await params;

    const body = await request.json();
    const { name, code, description, isActive, gradeScales } =
      updateSystemGradingSchema.parse(body);

    // Verify it is actually a system default
    const existing = await prisma.gradingSystem.findUnique({
      where: { id: gradingId },
    });

    if (!existing || !existing.isSystemDefault) {
      return new NextResponse("System default grading not found", {
        status: 404,
      });
    }

    // Check code uniqueness if code is being changed
    if (code && code !== existing.code) {
      const codeConflict = await prisma.gradingSystem.findFirst({
        where: {
          code,
          isSystemDefault: true,
          schoolId: null,
          id: { not: gradingId },
        },
      });

      if (codeConflict) {
        return new NextResponse(
          "A system default with this code already exists",
          { status: 409 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.gradingSystem.update({
        where: { id: gradingId },
        data: {
          ...(name && { name }),
          ...(code && { code }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      if (body.gradeScales !== undefined) {
        // Delete old scales
        await tx.gradeScale.deleteMany({
          where: { gradingSystemId: gradingId },
        });

        if (gradeScales && gradeScales.length > 0) {
          await tx.gradeScale.createMany({
            data: gradeScales.map((gs) => ({
              gradingSystemId: gradingId,
              grade: gs.grade,
              description: gs.description,
              minScore: gs.minScore,
              maxScore: gs.maxScore,
              gradePoint: gs.gradePoint,
              displayOrder: gs.displayOrder,
            })),
          });
        }
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.flatten()), { status: 400 });
    }
    console.error("[SYSTEM_GRADING_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ gradingId: string }> },
) {
  try {
    await requireSuperAdmin();
    const { gradingId } = await params;

    const existing = await prisma.gradingSystem.findUnique({
      where: { id: gradingId },
      include: {
        _count: { select: { assessmentTemplates: true } },
      },
    });

    if (!existing || !existing.isSystemDefault) {
      return new NextResponse("System default grading not found", {
        status: 404,
      });
    }

    await prisma.gradingSystem.delete({
      where: { id: gradingId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SYSTEM_GRADING_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
