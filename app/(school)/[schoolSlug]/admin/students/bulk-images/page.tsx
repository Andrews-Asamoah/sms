// app/(school)/[schoolSlug]/admin/students/bulk-images/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Images } from "lucide-react";
import { BulkImageUpload } from "@/components/school/students/bulk-image-upload";

interface BulkImagesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function BulkImagesPage({ params }: BulkImagesPageProps) {
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
          <h1 className="text-3xl font-bold tracking-tight">Bulk Photo Upload</h1>
          <p className="text-muted-foreground mt-1">
            Upload profile photos for multiple students at once
          </p>
        </div>
      </div>

      <Card className="backdrop-blur-sm bg-card/50 border-border/50 max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            Upload Student Photos
          </CardTitle>
          <CardDescription>
            Name each image file after the student&apos;s{" "}
            <strong>Student ID</strong> (e.g.{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              STU-26-0001.jpg
            </code>
            ) or <strong>Admission Number</strong>. Photos are automatically
            resized to 400×400 and converted to WebP before being stored.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkImageUpload schoolSlug={schoolSlug} />
        </CardContent>
      </Card>
    </div>
  );
}
