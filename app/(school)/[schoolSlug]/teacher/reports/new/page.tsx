import { requireAuth } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SupportTicketForm } from "@/components/school/Support/support-ticket-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  return { title: `New Report | ${schoolSlug}` };
}

export default async function NewTeacherReportPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  await requireAuth();

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, name: true },
  });

  if (!school) notFound();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">New Report</h1>
        <p className="text-muted-foreground mt-2">
          Submit a new report or support request to the school administration.
        </p>
      </div>

      <SupportTicketForm 
        schoolId={school.id} 
        schoolSlug={schoolSlug} 
        isInternal={true}
        portalType="teacher"
      />
    </div>
  );
}
