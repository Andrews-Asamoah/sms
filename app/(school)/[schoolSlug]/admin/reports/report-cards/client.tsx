"use client";

import {
  ClipboardList,
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReportCardSet {
  id: string;
  name: string;
  status: string;
  publishAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  academicYear: { name: string };
  term: { name: string };
  class: { name: string };
  _count: { reportCards: number };
}

interface ReportCardsClientProps {
  initialData: any[];
  schoolSlug: string;
}

export function ReportCardsClient({
  initialData,
  schoolSlug,
}: ReportCardsClientProps) {
  const router = useRouter();
  const sets = initialData as ReportCardSet[];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Published
          </Badge>
        );
      case "GENERATED":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Generated
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/5 text-amber-600 border-amber-200 hover:bg-amber-500/10"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Draft
          </Badge>
        );
    }
  };

  return (
    <Tabs defaultValue="all" className="w-full">
      <div className="flex items-center justify-between gap-4 mb-6">
        <TabsList className="bg-background/50 backdrop-blur-sm border border-border/50 p-1">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            All Sets
          </TabsTrigger>
          <TabsTrigger
            value="published"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Published
          </TabsTrigger>
          <TabsTrigger
            value="draft"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Drafts
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="all" className="mt-0 outline-none">
        {sets.length === 0 ? (
          <Card className="bg-background/40 backdrop-blur-md border-dashed border-2 py-20">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 rotate-3">
                <ClipboardList className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                No Report Card Sets
              </CardTitle>
              <CardDescription className="max-w-sm mt-3 text-base">
                Create your first report card set to generate academic results
                for a class and term.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sets.map((set) => (
              <Card
                key={set.id}
                className="group relative cursor-pointer border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
                onClick={() =>
                  router.push(
                    `/${schoolSlug}/admin/reports/report-cards/sets/${set.id}`,
                  )
                }
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />

                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    {getStatusBadge(set.status)}
                    <span className="text-xs font-medium text-muted-foreground flex items-center bg-muted/50 px-2 py-1 rounded-full">
                      <Calendar className="w-3 h-3 mr-1.5" />
                      {new Date(set.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
                    {set.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="bg-primary/5 text-primary font-medium border-none text-[10px] uppercase tracking-wider"
                    >
                      {set.academicYear.name}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground font-medium border-none text-[10px] uppercase tracking-wider"
                    >
                      {set.term.name}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-5">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-tighter">
                          Target Class
                        </span>
                        <span className="font-bold text-foreground">
                          {set.class.name}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-tighter">
                          Students
                        </span>
                        <span className="font-bold text-foreground">
                          {set._count.reportCards}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center group/btn py-1">
                      <p className="text-sm font-medium text-primary flex items-center">
                        Manage results
                      </p>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover/btn:bg-primary group-hover/btn:text-primary-foreground transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="published">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {sets
            .filter((s) => s.status === "PUBLISHED")
            .map((set) => (
              /* Simplified version or same as above */
              <div key={set.id}>Published set: {set.name}</div>
            ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
