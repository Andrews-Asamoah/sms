import { Separator } from "@/components/ui/separator";
import { SchoolLogoEditor } from "@/components/settings/school-logo-editor";
import { SchoolInfoForm } from "@/components/settings/school-info-form";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Image as ImageIcon } from "lucide-react";

interface SettingsPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { schoolSlug } = await params;

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: {
      id: true,
      name: true,
      motto: true,
      email: true,
      phone: true,
      address: true,
      logo: true,
      website: true,
    },
  });

  if (!school) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          School Settings
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Manage your school's identity, contact information, and public profile.
        </p>
      </div>

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Logo Management */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-xl">Branding</CardTitle>
              </div>
              <CardDescription>Update your school's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <SchoolLogoEditor 
                schoolId={school.id} 
                currentLogo={school.logo} 
                schoolName={school.name} 
              />
            </CardContent>
          </Card>
        </div>

        {/* Basic Info Management */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-xl">Basic Information</CardTitle>
              </div>
              <CardDescription>General details and contact information for the school</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <SchoolInfoForm school={school} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
