"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowUpDown,
  Mail,
  Loader2,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteReportCardSet } from "./actions";
import { unpublishReportCardSet } from "./actions";
import { formatStudentName } from "@/lib/utils/name-formatter";
import { cn } from "@/lib/utils";

type SortKey = "name" | "position" | "avgScore";

interface SetDetailClientProps {
  set: any;
  schoolSlug: string;
  school: any;
}

export function SetDetailClient({
  set,
  schoolSlug,
  school,
}: SetDetailClientProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayClasses: any[] = set.displayClasses ?? [];

  const [activeClassId, setActiveClassId] = useState<string>(
    displayClasses.length > 0 ? displayClasses[0].id : "",
  );
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const activeClass =
    displayClasses.find((c) => c.id === activeClassId) ?? displayClasses[0];

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

  const handleUnpublish = async () => {
    setUnpublishing(true);
    try {
      const result = await unpublishReportCardSet(schoolSlug, set.id);
      if (result.success) {
        toast.success("Report cards unpublished — results are now hidden from parents.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to unpublish");
      }
    } finally {
      setUnpublishing(false);
      setUnpublishDialogOpen(false);
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

  const handleSendEmails = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/report-cards/sets/${set.id}/send-emails`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId: activeClassId }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      toast.success(`Report cards emailed to ${data.sent} parent(s).`);
      setEmailDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge className="bg-green-500 font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Published
          </Badge>
        );
      case "GENERATED":
        return (
          <Badge className="bg-blue-500 font-bold">
            <FileText className="w-3 h-3 mr-1" />
            Generated
          </Badge>
        );
      case "GENERATING":
        return (
          <Badge className="bg-yellow-500 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Generating...
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  // Build sorted student list for the active class
  const sortedStudents = useMemo(() => {
    const classStudents: any[] = activeClass?.students ?? [];
    return [...classStudents].sort((a, b) => {
      if (sortKey === "name") {
        const nameA =
          `${a.profile.lastName} ${a.profile.firstName}`.toLowerCase();
        const nameB =
          `${b.profile.lastName} ${b.profile.firstName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      const rdA = set.reportCards.find((r: any) => r.studentId === a.id)
        ?.data as any;
      const rdB = set.reportCards.find((r: any) => r.studentId === b.id)
        ?.data as any;
      if (sortKey === "position") {
        return (rdA?.position ?? 9999) - (rdB?.position ?? 9999);
      }
      if (sortKey === "avgScore") {
        return (rdB?.average ?? -1) - (rdA?.average ?? -1);
      }
      return 0;
    });
  }, [activeClass, sortKey, set.reportCards]);

  // Count students in active class with published guardian emails
  const studentsWithParents = (activeClass?.students ?? []).filter((s: any) =>
    set.reportCards.find((r: any) => r.studentId === s.id && r.publishedAt),
  ).length;

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
            <div className="flex gap-2 flex-wrap justify-end">
              {["DRAFT", "GENERATED", "PUBLISHED"].includes(set.status) && (
                <Button
                  onClick={handleGenerate}
                  disabled={processing}
                  variant={
                    ["GENERATED", "PUBLISHED"].includes(set.status)
                      ? "outline"
                      : "default"
                  }
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${processing ? "animate-spin" : ""}`}
                  />
                  {["GENERATED", "PUBLISHED"].includes(set.status)
                    ? "Regenerate"
                    : "Generate All"}
                </Button>
              )}
              {/* Unpublish — only when PUBLISHED */}
              {set.status === "PUBLISHED" && (
                <Button
                  variant="outline"
                  onClick={() => setUnpublishDialogOpen(true)}
                  disabled={unpublishing}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                >
                  <EyeOff className="w-4 h-4 mr-2" />
                  Unpublish
                </Button>
              )}
              {["GENERATED", "PUBLISHED"].includes(set.status) && (
                <Button
                  onClick={handlePublish}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4 mr-2" />{" "}
                  {set.status === "PUBLISHED"
                    ? "Republish Results"
                    : "Publish Results"}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {/* Controls row: class selector + sort + email */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Class selector */}
              {displayClasses.length > 1 ? (
                <Select value={activeClassId} onValueChange={setActiveClassId}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Select class…" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayClasses.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                        <span className="ml-2 text-muted-foreground text-xs">
                          ({cls.students?.length ?? 0})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : displayClasses.length === 1 ? (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {displayClasses[0].name}
                </Badge>
              ) : null}

              {/* Sort selector */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={sortKey}
                  onValueChange={(v) => setSortKey(v as SortKey)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="position">Sort by Position</SelectItem>
                    <SelectItem value="avgScore">Sort by Avg Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email button */}
              {set.status === "PUBLISHED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                  onClick={() => setEmailDialogOpen(true)}
                >
                  <Mail className="h-4 w-4" />
                  Email to Parents
                </Button>
              )}
            </div>

            {/* Student Table */}
            {displayClasses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No classes assigned to this set.
              </div>
            ) : (
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
                  {sortedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No active students in this class.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedStudents.map((student: any) => {
                      const report = set.reportCards.find(
                        (r: any) => r.studentId === student.id,
                      );
                      const reportData = report?.data as any;
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {formatStudentName(
                              student.profile.firstName,
                              student.profile.lastName,
                              student.profile.otherNames,
                            )}
                          </TableCell>
                          <TableCell>
                            {report ? (
                              <Badge
                                variant="secondary"
                                className={
                                  report.publishedAt
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                }
                              >
                                {report.publishedAt ? "Published" : "Generated"}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground border-dashed"
                              >
                                No Report
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {reportData?.average != null
                              ? `${Math.round(reportData.average)}%`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {reportData?.position
                              ? `${reportData.position}${reportData.positionSuffix}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {report && (
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" asChild>
                                  <Link
                                    href={`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}/students/${student.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                </Button>
                                {mounted ? (
                                  <PDFDownloadLink
                                    document={
                                      <ReportCardPDF
                                        data={reportData}
                                        school={school}
                                      />
                                    }
                                    fileName={`${student.profile.firstName}_${student.profile.lastName}_Report.pdf`}
                                  >
                                    {({ loading }) => (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={loading}
                                      >
                                        <Download
                                          className={cn(
                                            "w-4 h-4",
                                            loading && "animate-pulse",
                                          )}
                                        />
                                      </Button>
                                    )}
                                  </PDFDownloadLink>
                                ) : (
                                  <Button variant="ghost" size="icon" disabled>
                                    <Download className="w-4 h-4 opacity-50" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
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
              <span className="font-bold text-blue-600">
                {set.reportCards.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link
                href={`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}/broad-sheet${activeClassId ? `?classId=${activeClassId}` : ""}`}
              >
                <FileText className="w-4 h-4 mr-2" /> Class Broad Sheet
              </Link>
            </Button>
            {set.reportCards.length > 0 && mounted && (
              <PDFDownloadLink
                document={
                  <BulkReportPDF
                    reportCards={set.reportCards}
                    school={school}
                  />
                }
                fileName={`${set.name}_All_Reports.pdf`}
              >
                {({ loading }) => (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={loading}
                  >
                    <Printer
                      className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                    />
                    {loading ? "Preparing Reports..." : "Print All Reports"}
                  </Button>
                )}
              </PDFDownloadLink>
            )}

            {set.status === "DRAFT" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    disabled={deleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting ? "Deleting..." : "Delete Set"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Report Card Set?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{set.name}</strong>{" "}
                      and all generated reports. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleDelete}
                    >
                      Yes, delete it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unpublish Confirmation Dialog */}
      <AlertDialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Report Cards?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide all report cards in <strong>{set.name}</strong> from parents and
              guardians. The reports will remain in <strong>Generated</strong> status and can be
              re-published at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleUnpublish}
              disabled={unpublishing}
            >
              {unpublishing ? "Unpublishing..." : "Yes, unpublish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Confirmation Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Report Cards to Parents</DialogTitle>
            <DialogDescription>
              This will email published report cards to the parents/guardians of
              students in{" "}
              <strong>{activeClass?.name ?? "the selected class"}</strong>. Only
              students with published reports and linked guardians with email
              addresses will receive emails.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            <p>
              Published reports in this class:{" "}
              <strong>{studentsWithParents}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmails}
              disabled={sendingEmail}
              className="gap-2"
            >
              {sendingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
              <Mail className="h-4 w-4" />
              {sendingEmail ? "Sending…" : "Send Emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
