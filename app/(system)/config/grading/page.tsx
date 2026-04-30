import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { SystemGradingClient } from "./client";
import { Scale } from "lucide-react";

export const metadata = {
  title: "Global Grading Scales | SuperAdmin Dashboard",
  description:
    "Create and manage system-wide grading scale templates that schools can adopt.",
};

export default async function GradingSystemsPage() {
  await requireSuperAdmin();

  const rawSystems = await prisma.gradingSystem.findMany({
    where: { isSystemDefault: true },
    include: {
      gradeScales: {
        orderBy: { displayOrder: "asc" },
      },
      _count: {
        select: {
          gradeScales: true,
          assessmentTemplates: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Serialize Decimal → number for client components
  const systems = rawSystems.map((gs) => ({
    ...gs,
    gradeScales: gs.gradeScales.map((scale) => ({
      ...scale,
      minScore: Number(scale.minScore),
      maxScore: Number(scale.maxScore),
      gradePoint: Number(scale.gradePoint),
    })),
  }));

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-purple-500/10 rounded-xl mt-0.5">
          <Scale className="h-7 w-7 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Global Grading Systems
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Define system-wide grading scale templates (e.g., WAEC BECE,
            Cambridge IGCSE, custom GPA). Schools browse these defaults and
            adopt the ones that suit them — giving each school their own editable
            copy.
          </p>
        </div>
      </div>

      <SystemGradingClient data={systems} />
    </div>
  );
}
