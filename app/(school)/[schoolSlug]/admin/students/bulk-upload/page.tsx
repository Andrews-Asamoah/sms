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
import { ArrowLeft, Download, Upload, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface BulkUploadPageProps {
  params: Promise<{ schoolId: string }>;
}

export default async function BulkUploadPage({ params }: BulkUploadPageProps) {
  const { schoolId } = await params;

  const session = await requireSchoolAccess(schoolId);
  const role = getSchoolRole(session, schoolId);

  // Check authorization
  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolId}/unauthorized`);
  }

  // Fetch school
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolId },
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
        <Link href={`/${schoolId}/admin/students`}>
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
                Download Template
              </CardTitle>
              <CardDescription className="mt-1">
                Get the Excel template with the required data format
              </CardDescription>
            </div>
            <Link href={`/api/schools/${schoolId}/students/template`}>
              <Button size="lg">
                <Download className="mr-2 h-5 w-5" />
                Download Template
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      {/* Upload Form */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Students Data
          </CardTitle>
          <CardDescription>
            Upload the completed Excel file with student information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkUploadForm
            schoolId={school.id}
            schoolSlug={schoolId}
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
                <li>Gender (MALE/FEMALE/OTHER)</li>
                <li>Date of Birth (YYYY-MM-DD format)</li>
                <li>Admission Date (YYYY-MM-DD format)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Optional Columns</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Other Names, Phone, Alternate Phone</li>
                <li>Residential Address, City, Region, Country</li>
                <li>
                  Admission Number, Class Name, Department Name, House Name
                </li>
                <li>Previous School, Previous Class</li>
                <li>Blood Group, Allergies, Medical Conditions</li>
                <li>Emergency Contact Name, Phone, Relationship</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
