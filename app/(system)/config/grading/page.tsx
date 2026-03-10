import { requireSuperAdmin } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Scale, FileText } from "lucide-react";

export const metadata = {
  title: "Global Grading Systems | SuperAdmin Dashboard",
  description: "Manage global grading templates for all schools",
};

export default async function GradingSystemsPage() {
  await requireSuperAdmin();

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Global Grading Systems
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage international and national grading scale templates (e.g., WAEC,
          Cambridge).
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Templates */}
        <Card className="hover:shadow-lg transition-all group">
          <CardHeader>
            <div className="p-3 bg-purple-500/10 w-fit rounded-lg mb-4 group-hover:bg-purple-500/20 transition-colors">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Standard Templates</CardTitle>
            <CardDescription>
              Preconfigured scales mapping percentages to letter grades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> WAEC / WASSCE Standards
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Cambridge IGCSE
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Generic 4.0 GPA
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all group">
          <CardHeader>
            <div className="p-3 bg-indigo-500/10 w-fit rounded-lg mb-4 group-hover:bg-indigo-500/20 transition-colors">
              <Scale className="h-6 w-6 text-indigo-600" />
            </div>
            <CardTitle>Custom Scales</CardTitle>
            <CardDescription>
              Approve custom scale designs created by individual schools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No pending custom scale reviews at this time.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
