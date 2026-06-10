import React from "react";
import {
  FileText,
  BarChart3,
  Users,
  DollarSign,
  GraduationCap,
  Award,
  Calendar,
  ChevronRight,
  Heart,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reportCategories = [
  {
    title: "Academic Reports",
    description: "Results, summaries, and performance tracking",
    items: [
      {
        name: "Report Cards",
        description: "Student termly result sheets and PDFs",
        href: "reports/report-cards",
        icon: FileText,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        name: "Class Analysis",
        description: "Broad sheets and class performance summaries",
        href: "reports/report-cards", // Linked to the same hub for now
        icon: Award,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      },
      {
        name: "Subject Performance",
        description: "Analyze grades across subjects",
        href: "reports/subject-performance",
        icon: GraduationCap,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      },
    ],
  },
  {
    title: "Operations & Finance",
    description: "Attendance, payments, and administrative summaries",
    items: [
      {
        name: "Attendance Reports",
        description: "Track student and staff attendance patterns",
        href: "reports/attendance",
        icon: Calendar,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
      {
        name: "Fee Collections",
        description: "Summaries of revenue and outstanding bills",
        href: "finance/reports",
        icon: DollarSign,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
      },
      {
        name: "Enrollment Trends",
        description: "Student population and demographic reports",
        href: "reports/enrollment",
        icon: Users,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
      },
      {
        name: "Medical Reports",
        description: "Track student conditions and allergies",
        href: "reports/medical",
        icon: Heart,
        color: "text-rose-600",
        bgColor: "bg-rose-50",
      },
    ],
  },
];

export default async function ReportsPage(props: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await props.params;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports Hub</h2>
          <p className="text-muted-foreground">
            Centralized access to all school data reports and analytics.
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        {reportCategories.map((category) => (
          <div key={category.title} className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">{category.title}</h3>
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {category.items.map((report) => (
                <Card
                  key={report.name}
                  className="hover:shadow-md transition-all cursor-pointer group"
                >
                  <Link href={`/${schoolSlug}/admin/${report.href}`}>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                      <div
                        className={`p-2 rounded-lg ${report.bgColor} ${report.color} group-hover:scale-110 transition-transform`}
                      >
                        <report.icon size={24} />
                      </div>
                      <ChevronRight
                        className="ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform"
                        size={18}
                      />
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                        {report.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {report.description}
                      </CardDescription>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
