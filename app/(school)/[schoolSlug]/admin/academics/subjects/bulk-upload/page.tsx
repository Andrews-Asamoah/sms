import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { BulkUploadForm } from "@/components/school/subjects/bulk-upload-form";
import { Download, Upload, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SubjectsBulkUploadPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function SubjectsBulkUploadPage({
  params,
}: SubjectsBulkUploadPageProps) {
  const { schoolSlug } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <Link
            href={`/${schoolSlug}/admin/academics/subjects`}
            className="hover:text-primary transition-colors"
          >
            Subjects
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="text-foreground font-medium">Bulk Upload</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Upload className="h-8 w-8 text-primary" />
              Bulk Upload Subjects
            </h1>
            <p className="text-muted-foreground mt-1">
              Import multiple subjects at once using an Excel template.
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href={`/api/schools/${schoolSlug}/subjects/template`} download>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </a>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="bg-background rounded-lg border shadow-sm p-6">
              <BulkUploadForm schoolSlug={schoolSlug} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-5">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                How it works
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <li>Download the Excel template using the button above.</li>
                <li>Fill in the subject details. Columns marked with an asterisk (*) are required.</li>
                <li>For departments, you can provide comma-separated department codes (e.g., 'SCI, MATH'). See the 'Valid Departments' sheet for references.</li>
                <li>Save the file and upload it here.</li>
                <li>Review the upload results and correct any errors if needed.</li>
              </ol>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-5">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                Important Notes
              </h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-amber-800 dark:text-amber-300">
                <li>Subjects with existing codes will be skipped automatically.</li>
                <li>Department codes must match exactly what is shown in the system.</li>
                <li>Periods Per Week must be a number between 1 and 10.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
