// app/(school)/[schoolSlug]/admin/classes/bulk-upload/page.tsx

import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { BulkUploadForm } from "@/components/school/classes/bulk-upload-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface BulkUploadPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ClassesBulkUploadPage({
  params,
}: BulkUploadPageProps) {
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

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${schoolSlug}/admin/classes`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bulk Upload Classes
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload multiple classes at once using an Excel file
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>How to use bulk upload</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Download the Excel template using the button below</li>
            <li>Fill in the class data following the provided format</li>
            <li>Save the file and upload it using the upload form</li>
            <li>Review the preview and confirm the upload</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Template Download */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Download Excel Template
              </CardTitle>
              <CardDescription className="mt-1">
                Get the pre-formatted Excel template with instructions and
                sample data
              </CardDescription>
            </div>
            <Link href={`/api/schools/${schoolSlug}/classes/template`}>
              <Button size="lg" className="gap-2">
                <Download className="h-5 w-5" />
                Download Template
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Template includes:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>✓ Pre-formatted columns with proper headers</li>
              <li>✓ Sample data row to guide you</li>
              <li>✓ Detailed instructions sheet</li>
              <li>✓ Reference data (departments, teachers)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Classes Data
          </CardTitle>
          <CardDescription>
            Upload the completed Excel file (.xlsx or .xls only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkUploadForm schoolSlug={schoolSlug} />
        </CardContent>
      </Card>

      {/* Column Reference */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Column Reference</CardTitle>
          <CardDescription>
            Required and optional columns in the template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">
                Required Columns (marked with *)
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Name (e.g., Basic 1A)</li>
                <li>Level (e.g., Primary, JHS, SHS)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Optional Columns</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Capacity (Number of students)</li>
                <li>Class Teacher ID or Email</li>
                <li>Department Name</li>
                <li>Graduating Class (YES/NO)</li>
                <li>Order (Number for sorting)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
