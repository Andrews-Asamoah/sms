"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Send, RefreshCw, Eye, Download, Printer,
  CheckCircle2, Clock, AlertCircle, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic_next from "next/dynamic";

const PDFDownloadLink = dynamic_next(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false },
);

import {
  ReportCardPDF,
  BulkReportPDF,
} from "@/components/school/report-cards/report-card-pdf";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteReportCardSet } from "./actions";
import { formatStudentName } from "@/lib/utils/name-formatter";

interface SetDetailClientProps {
  set: any;
  schoolSlug: string;
  school: any;
}

export function SetDetailClient({ set, schoolSlug, school }: SetDetailClientProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const displayClasses: any[] = set.displayClasses ?? [];
  const [activeClassId, setActiveClassId] = useState<string | undefined>(
    displayClasses.length > 0 ? displayClasses[0].id : undefined
  );

  const handleGenerate = async () => {
    setProcessing(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/report-cards/sets/${set.id}/generate`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Generation failed");
      toast.success("Report cards generated successfully");
      router.refresh();
    } catch {
      toast.error("Failed to generate report cards");
    } finally {
      setProcessing(false);
    }
  };

  const handlePublish = async () => {
    setProcessing(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/report-cards/sets/${set.id}/publish`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Publishing failed");
      toast.success("Report cards published successfully");
      router.refresh();
    } catch {
      toast.error("Failed to publish report cards");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteReportCardSet(schoolSlug, set.id);
      if (result.success) {
        toast.success("Report card set deleted");
        router.push(`/${schoolSlug}/admin/reports/report-cards`);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge className="bg-green-500 font-bold tracking-tight"><CheckCircle2 className="w-3 h-3 mr-1" /> Published</Badge>;
      case "GENERATED":
        return <Badge className="bg-blue-500 font-bold tracking-tight"><FileText className="w-3 h-3 mr-1" /> Generated</Badge>;
      case "GENERATING":
        return <Badge className="bg-yellow-500 animate-pulse"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Generating...</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
    }
  };

  const StudentTable = ({ cls }: { cls: any }) => {
    const classStudents = cls.students ?? [];
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Student Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Avg Score</TableHead>
            <TableHead>Position</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classStudents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No active students in this class.
              </TableCell>
            </TableRow>
          ) : (
            classStudents.map((student: any) => {
              const report = set.reportCards.find((r: any) => r.studentId === student.id);
              const reportData = report?.data as any;
              return (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {formatStudentName(
                      student.profile.firstName,
                      student.profile.lastName,
                      student.profile.otherNames
                    )}
                  </TableCell>
                  <TableCell>
                    {report ? (
                      <Badge variant="secondary" className={report.publishedAt ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                        {report.publishedAt ? "Published" : "Generated"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-dashed">No Report</Badge>
                    )}
                  </TableCell>
                  <TableCell>{reportData?.average ? `${reportData.average}%` : "—"}</TableCell>
                  <TableCell>{reportData?.position ? `${reportData.position}${reportData.positionSuffix}` : "—"}</TableCell>
                  <TableCell className="text-right">
                    {report && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}/students/${student.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <PDFDownloadLink
                          document={<ReportCardPDF data={reportData} school={school} />}
                          fileName={`${student.profile.firstName}_${student.profile.lastName}_Report.pdf`}
                        >
                          {({ loading }) => (
                            <Button variant="ghost" size="icon" disabled={loading}>
                              <Download className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
                            </Button>
                          )}
                        </PDFDownloadLink>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-4">
      {/* Main Content */}
      <div className="col-span-3 space-y-4">
        <Card className="bg-background border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div>
              <CardTitle className="text-xl">Student Reports</CardTitle>
              <CardDescription>
                {displayClasses.length > 1
                  ? `${displayClasses.length} classes — ${set.totalStudents} total students`
                  : "Review and manage academic performance reports."}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {(set.status === "DRAFT" || set.status === "GENERATED") && (
                <Button onClick={handleGenerate} disabled={processing} variant={set.status === "GENERATED" ? "outline" : "default"}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${processing ? "animate-spin" : ""}`} />
                  {set.status === "GENERATED" ? "Regenerate" : "Generate All"}
                </Button>
              )}
              {set.status === "GENERATED" && (
                <Button onClick={handlePublish} disabled={processing} className="bg-green-600 hover:bg-green-700">
                  <Send className="w-4 h-4 mr-2" /> Publish Results
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {displayClasses.length > 1 ? (
              <Tabs defaultValue={displayClasses[0]?.id} onValueChange={setActiveClassId}>
                <div className="px-4 pt-4 border-b">
                  <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
                    {displayClasses.map((cls: any) => (
                      <TabsTrigger
                        key={cls.id}
                        value={cls.id}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/50 rounded-md px-3 py-1.5 text-sm"
                      >
                        <Users className="h-3 w-3 mr-1.5" />
                        {cls.name}
                        <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1">
                          {cls.students?.length ?? 0}
                        </Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {displayClasses.map((cls: any) => (
                  <TabsContent key={cls.id} value={cls.id} className="m-0">
                    <StudentTable cls={cls} />
                  </TabsContent>
                ))}
              </Tabs>
            ) : displayClasses.length === 1 ? (
              <StudentTable cls={displayClasses[0]} />
            ) : (
              <div className="p-8 text-center text-muted-foreground">No classes assigned to this set.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card className="bg-background border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Set Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm items-center py-2 border-b">
              <span className="text-muted-foreground">Status</span>
              {getStatusBadge(set.status)}
            </div>
            <div className="flex justify-between text-sm py-2 border-b">
              <span className="text-muted-foreground">Classes</span>
              <span className="font-bold">{displayClasses.length}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b">
              <span className="text-muted-foreground">Students</span>
              <span className="font-bold">{set.totalStudents}</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-muted-foreground">Reports</span>
              <span className="font-bold text-blue-600">{set.reportCards.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border shadow-sm">
          <CardHeader><CardTitle className="text-lg">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link
                href={`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}/broad-sheet${
                  activeClassId ? `?classId=${activeClassId}` : ""
                }`}
              >
                <FileText className="w-4 h-4 mr-2" /> Class Broad Sheet
              </Link>
            </Button>
            {set.reportCards.length > 0 && (
              <PDFDownloadLink
                document={<BulkReportPDF reportCards={set.reportCards} school={school} />}
                fileName={`${set.name}_All_Reports.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" className="w-full justify-start" disabled={loading}>
                    <Printer className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Preparing Reports..." : "Print All Reports"}
                  </Button>
                )}
              </PDFDownloadLink>
            )}

            {/* Delete — only for DRAFT sets */}
            {set.status === "DRAFT" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full justify-start" disabled={deleting}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting ? "Deleting..." : "Delete Set"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Report Card Set?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{set.name}</strong> and all generated reports within it. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
                      Yes, delete it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
