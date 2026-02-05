// app/(school)/[schoolSlug]/admin/students/bulk-upload/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { BulkUploadForm } from "@/components/school/students/bulk-upload-form";
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

export default async function BulkUploadPage({ params }: BulkUploadPageProps) {
  const { schoolSlug } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // Check authorization
  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Fetch school
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  // Fetch form options
  const [classes, departments, houses] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: school.id, isActive: true },
      include: { academicYear: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { schoolId: school.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.house.findMany({
      where: { schoolId: school.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${schoolSlug}/admin/students`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bulk Upload Students
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload multiple students at once using an Excel file
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
            <li>Fill in the student data following the provided format</li>
            <li>Student IDs and Admission Numbers will be auto-generated</li>
            <li>Save the file and upload it using the upload form</li>
            <li>Review the preview and confirm the upload</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Important Notice */}
      <Alert variant="default" className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Auto-Generated IDs</AlertTitle>
        <AlertDescription className="text-blue-800">
          <div className="space-y-1 mt-2">
            <p>
              <strong>Student IDs:</strong> Will be auto-generated as STU00001,
              STU00002, etc.
            </p>
            <p>
              <strong>Admission Numbers:</strong> Will be auto-generated as{" "}
              {school.code}0001, {school.code}0002, etc.
            </p>
            <p className="text-sm mt-2">
              Do NOT include these columns in your Excel file - they will be
              created automatically.
            </p>
          </div>
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
            <Link href={`/api/schools/${schoolSlug}/students/template`}>
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
              <li>✓ Reference data (classes, departments, houses)</li>
              <li>✓ Field validation rules and examples</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Students Data
          </CardTitle>
          <CardDescription>
            Upload the completed Excel file (.xlsx or .xls only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkUploadForm
            schoolId={school.id}
            schoolSlug={schoolSlug}
            schoolCode={school.code}
            classes={classes}
            departments={departments}
            houses={houses}
          />
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
                <li>First Name</li>
                <li>Last Name</li>
                <li>Gender (MALE/FEMALE/OTHER - case sensitive)</li>
                <li>Date of Birth (YYYY-MM-DD format)</li>
                <li>Admission Date (YYYY-MM-DD format)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Auto-Generated Fields</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  Student ID - Automatically generated (STU00001, STU00002,
                  etc.)
                </li>
                <li>
                  Admission Number - Automatically generated ({school.code}0001,{" "}
                  {school.code}0002, etc.)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Optional Columns</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Other Names, Phone, Alternate Phone</li>
                <li>Residential Address, City, Region, Country</li>
                <li>Class Name, Department Name, House Name</li>
                <li>Previous School, Previous Class</li>
                <li>Blood Group, Allergies, Medical Conditions</li>
                <li>Emergency Contact Name, Phone, Relationship</li>
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-amber-900">
                Important Notes:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
                <li>Only Excel files (.xlsx, .xls) are accepted</li>
                <li>
                  Gender must be exactly: MALE, FEMALE, or OTHER (uppercase)
                </li>
                <li>Dates must be in YYYY-MM-DD format (e.g., 2010-01-15)</li>
                <li>Class, Department, and House names must match exactly</li>
                <li>Delete the sample data row before adding your data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
