"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  FileText, Send, RefreshCw, Eye, EyeOff, Download, Printer,
  CheckCircle2, Clock, Trash2, ArrowUpDown, Mail, Loader2,
  Users, BarChart3, GraduationCap, ChevronRight, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic_next from "next/dynamic";

const BlobProvider = dynamic_next(
  () => import("@react-pdf/renderer").then((mod) => mod.BlobProvider),
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { deleteReportCardSet, unpublishReportCardSet } from "./actions";
import { formatStudentName } from "@/lib/utils/name-formatter";
import { cn } from "@/lib/utils";

type SortKey = "name" | "position" | "avgScore";

interface SetDetailClientProps {
  set: any;
  schoolSlug: string;
  school: any;
  initialClassId?: string;
  gradingSystem?: any;
}

export function SetDetailClient({
  set,
  schoolSlug,
  school,
  initialClassId,
  gradingSystem,
}: SetDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [processing, setProcessing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const [activeDownload, setActiveDownload] = useState<{
    studentId: string;
    reportData: any;
    fileName: string;
  } | null>(null);

  const [activePrint, setActivePrint] = useState<{
    studentId: string;
    reportData: any;
  } | null>(null);

  const [activeBulkPrint, setActiveBulkPrint] = useState<{
    reportCards: any[];
    fileName: string;
  } | null>(null);

  const displayClasses: any[] = set.displayClasses ?? [];

  const [activeClassId, setActiveClassIdState] = useState<string>(
    initialClassId || (displayClasses.length > 0 ? displayClasses[0].id : ""),
  );
  const [sortKey, setSortKey] = useState<SortKey>("name");

  useEffect(() => {
    if (initialClassId && initialClassId !== activeClassId) {
      setActiveClassIdState(initialClassId);
    }
  }, [initialClassId, activeClassId]);

  const setActiveClassId = (id: string) => {
    setActiveClassIdState(id);
    const params = new URLSearchParams(window.location.search);
    if (id) {
      params.set("classId", id);
    } else {
      params.delete("classId");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const activeClass =
    displayClasses.find((c) => c.id === activeClassId) ?? displayClasses[0];

  // ── API Actions ────────────────────────────────────────────────────────────

  const handleGenerate = async (classId?: string) => {
    setProcessing(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/report-cards/sets/${set.id}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(classId ? { classId } : {}),
        },
      );
      if (!response.ok) throw new Error("Generation failed");
      toast.success(
        classId
          ? `Report cards generated for ${activeClass?.name ?? "selected class"}`
          : "Report cards generated successfully",
      );
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

  // ── Derived data ──────────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-200/50 text-[11px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Published
          </Badge>
        );
      case "GENERATED":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border border-blue-200/50 text-[11px]">
            <FileText className="w-3 h-3 mr-1" /> Generated
          </Badge>
        );
      case "GENERATING":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200/50 text-[11px] animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Generating…
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground text-[11px]">
            <Clock className="w-3 h-3 mr-1" /> Draft
          </Badge>
        );
    }
  };

  const sortedStudents = useMemo(() => {
    const classStudents: any[] = activeClass?.students ?? [];
    return [...classStudents].sort((a, b) => {
      if (sortKey === "name") {
        return `${a.profile.lastName} ${a.profile.firstName}`
          .toLowerCase()
          .localeCompare(`${b.profile.lastName} ${b.profile.firstName}`.toLowerCase());
      }
      const rdA = set.reportCards.find((r: any) => r.studentId === a.id)?.data as any;
      const rdB = set.reportCards.find((r: any) => r.studentId === b.id)?.data as any;
      if (sortKey === "position") return (rdA?.position ?? 9999) - (rdB?.position ?? 9999);
      if (sortKey === "avgScore") return (rdB?.average ?? -1) - (rdA?.average ?? -1);
      return 0;
    });
  }, [activeClass, sortKey, set.reportCards]);

  const studentsWithParents = (activeClass?.students ?? []).filter((s: any) =>
    set.reportCards.find((r: any) => r.studentId === s.id && r.publishedAt),
  ).length;

  const activeStudentIds = new Set((activeClass?.students ?? []).map((s: any) => s.id));
  const classReportCards = set.reportCards.filter((r: any) => activeStudentIds.has(r.studentId));
  const generatedCount = set.reportCards.length;
  const totalStudents = set.totalStudents;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Summary strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Status",   value: getStatusBadge(set.status),          icon: null },
          { label: "Classes",  value: displayClasses.length,                icon: GraduationCap, color: "text-primary",     bg: "bg-primary/10" },
          { label: "Students", value: totalStudents,                         icon: Users,          color: "text-blue-600",    bg: "bg-blue-500/10" },
          { label: "Reports",  value: `${generatedCount}/${totalStudents}`,  icon: BarChart3,      color: "text-emerald-600", bg: "bg-emerald-500/10" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex flex-col justify-between gap-2 bg-background/60 border border-border/50 rounded-xl px-3 py-3 sm:px-4"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{item.label}</span>
            {item.icon ? (
              <div className="flex items-center gap-2">
                <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", item.bg)}>
                  <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                </div>
                <span className="text-xl font-black">{item.value as string}</span>
              </div>
            ) : (
              <div>{item.value as React.ReactNode}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Main layout: content + sidebar stack on mobile ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

        {/* ── Student list (main content) ────────────────────────────────── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          <Card className="bg-background border shadow-sm">
            {/* Card header — primary actions */}
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Student Reports</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">
                      {displayClasses.length > 1
                        ? `${displayClasses.length} classes — ${totalStudents} total students`
                        : "Review and manage academic performance reports."}
                    </CardDescription>
                  </div>

                  {/* Primary action buttons — full width on mobile */}
                  <div className="flex flex-col xs:flex-row flex-wrap gap-2">
                    {["DRAFT", "GENERATED", "PUBLISHED"].includes(set.status) && (
                      <Button
                        onClick={() => handleGenerate()}
                        disabled={processing}
                        variant={["GENERATED", "PUBLISHED"].includes(set.status) ? "outline" : "default"}
                        size="sm"
                        className="w-full xs:w-auto"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${processing ? "animate-spin" : ""}`} />
                        {["GENERATED", "PUBLISHED"].includes(set.status) ? "Regenerate" : "Generate"}
                        <span className="hidden sm:inline ml-1">All</span>
                      </Button>
                    )}
                    {set.status === "PUBLISHED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUnpublishDialogOpen(true)}
                        disabled={unpublishing}
                        className="w-full xs:w-auto border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                      >
                        <EyeOff className="w-3.5 h-3.5 mr-1.5" /> Unpublish
                      </Button>
                    )}
                    {["GENERATED", "PUBLISHED"].includes(set.status) && (
                      <Button
                        onClick={handlePublish}
                        disabled={processing}
                        size="sm"
                        className="w-full xs:w-auto bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        {set.status === "PUBLISHED" ? "Republish" : "Publish"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Controls row: class selector + sort + email */}
                <div className="flex flex-wrap items-center gap-2">
                  {displayClasses.length > 1 ? (
                    <Select value={activeClassId} onValueChange={setActiveClassId}>
                      <SelectTrigger className="w-full sm:w-52 h-8 text-sm">
                        <SelectValue placeholder="Select class…" />
                      </SelectTrigger>
                      <SelectContent>
                        {displayClasses.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                            <span className="ml-2 text-muted-foreground text-xs">({cls.students?.length ?? 0})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : displayClasses.length === 1 ? (
                    <Badge variant="outline" className="text-xs px-3 py-1">{displayClasses[0].name}</Badge>
                  ) : null}

                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                      <SelectTrigger className="w-36 sm:w-40 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">By Name</SelectItem>
                        <SelectItem value="position">By Position</SelectItem>
                        <SelectItem value="avgScore">By Avg Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {set.status === "PUBLISHED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950 h-8"
                      onClick={() => setEmailDialogOpen(true)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Email Parents</span>
                      <span className="xs:hidden">Email</span>
                    </Button>
                  )}

                  {/* Per-class generate — only when multiple classes */}
                  {displayClasses.length > 1 && activeClassId && (
                    <Button
                      onClick={() => handleGenerate(activeClassId)}
                      disabled={processing}
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1.5 ${processing ? "animate-spin" : ""}`} />
                      Gen. {activeClass?.name ?? "Class"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {displayClasses.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No classes assigned to this set.
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="font-semibold text-xs">Student</TableHead>
                          <TableHead className="font-semibold text-xs">Status</TableHead>
                          <TableHead className="font-semibold text-xs">Avg Score</TableHead>
                          <TableHead className="font-semibold text-xs">Position</TableHead>
                          <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedStudents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                              No active students in this class.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedStudents.map((student: any) => {
                            const report = set.reportCards.find((r: any) => r.studentId === student.id);
                            const reportData = report?.data as any;
                            return (
                              <TableRow key={student.id} className="group hover:bg-muted/20">
                                <TableCell className="font-medium text-sm py-3">
                                  {formatStudentName(
                                    student.profile.firstName,
                                    student.profile.lastName,
                                    student.profile.otherNames,
                                  )}
                                </TableCell>
                                <TableCell className="py-3">
                                  {report ? (
                                    <Badge
                                      variant="secondary"
                                      className={report.publishedAt
                                        ? "bg-emerald-100 text-emerald-700 text-[11px]"
                                        : "bg-blue-100 text-blue-700 text-[11px]"}
                                    >
                                      {report.publishedAt ? "Published" : "Generated"}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground border-dashed text-[11px]">
                                      No Report
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="py-3 text-sm">
                                  {reportData?.average != null ? `${Math.round(reportData.average)}%` : "—"}
                                </TableCell>
                                <TableCell className="py-3 text-sm">
                                  {reportData?.position
                                    ? `${reportData.position}${reportData.positionSuffix}`
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-right py-3">
                                  {report && (
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                        <Link href={`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}/students/${student.id}`}>
                                          <Eye className="w-3.5 h-3.5" />
                                        </Link>
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => setActiveDownload({
                                          studentId: student.id,
                                          reportData,
                                          fileName: `${student.profile.firstName}_${student.profile.lastName}_Report.pdf`,
                                        })}>
                                        <Download className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => setActivePrint({ studentId: student.id, reportData })}>
                                        <Printer className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile card list */}
                  <div className="sm:hidden divide-y divide-border/50">
                    {sortedStudents.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No active students in this class.
                      </div>
                    ) : (
                      sortedStudents.map((student: any) => {
                        const report = set.reportCards.find((r: any) => r.studentId === student.id);
                        const reportData = report?.data as any;
                        return (
                          <div key={student.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">
                                {formatStudentName(
                                  student.profile.firstName,
                                  student.profile.lastName,
                                  student.profile.otherNames,
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {report ? (
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-[10px] px-1.5",
                                      report.publishedAt
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-blue-100 text-blue-700"
                                    )}
                                  >
                                    {report.publishedAt ? "Published" : "Generated"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground border-dashed">
                                    No Report
                                  </Badge>
                                )}
                                {reportData?.average != null && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {Math.round(reportData.average)}%
                                  </span>
                                )}
                                {reportData?.position && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {reportData.position}{reportData.positionSuffix}
                                  </span>
                                )}
                              </div>
                            </div>
                            {report && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 ml-2">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}/students/${student.id}`}>
                                      <Eye className="w-4 h-4 mr-2" /> View Report
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setActiveDownload({
                                    studentId: student.id,
                                    reportData,
                                    fileName: `${student.profile.firstName}_${student.profile.lastName}_Report.pdf`,
                                  })}>
                                    <Download className="w-4 h-4 mr-2" /> Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setActivePrint({ studentId: student.id, reportData })}>
                                    <Printer className="w-4 h-4 mr-2" /> Print Report
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Bulk actions card */}
          <Card className="bg-background border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bulk Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm h-auto py-2 whitespace-normal text-left" asChild>
                <Link href={`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}/broad-sheet${activeClassId ? `?classId=${activeClassId}` : ""}`} className="flex items-start">
                  <FileText className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                  <span>Class Broad Sheet</span>
                </Link>
              </Button>

              {classReportCards.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm h-auto py-2 whitespace-normal text-left flex items-start"
                  onClick={() => setActiveBulkPrint({
                    reportCards: classReportCards,
                    fileName: `${set.name}_${activeClass?.name ?? "Class"}_Reports.pdf`,
                  })}
                >
                  <Printer className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                  <span>Print {activeClass?.name ?? "Class"}</span>
                </Button>
              )}

              {displayClasses.length > 1 && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm h-auto py-2 whitespace-normal text-left flex items-start text-muted-foreground"
                  onClick={() => setActiveBulkPrint({
                    reportCards: set.reportCards,
                    fileName: `${set.name}_All_Reports.pdf`,
                  })}
                >
                  <Printer className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                  <span>Print All Reports</span>
                </Button>
              )}

              {set.status === "DRAFT" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full justify-start text-sm h-auto py-2 whitespace-normal text-left flex items-start"
                      disabled={deleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                      <span>{deleting ? "Deleting..." : "Delete Set"}</span>
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

      {/* ── Dialogs ───────────────────────────────────────────────────── */}

      <AlertDialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Report Cards?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide all report cards in <strong>{set.name}</strong> from parents and
              guardians. Reports stay in <strong>Generated</strong> status and can be re-published at any time.
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

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Report Cards to Parents</DialogTitle>
            <DialogDescription>
              This will email published report cards to parents/guardians of students in{" "}
              <strong>{activeClass?.name ?? "the selected class"}</strong>. Only students with
              published reports and linked guardians with email addresses will receive emails.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            <p>Published reports in this class: <strong>{studentsWithParents}</strong></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmails} disabled={sendingEmail} className="gap-2">
              {sendingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
              <Mail className="h-4 w-4" />
              {sendingEmail ? "Sending…" : "Send Emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Blob providers */}
      {activeDownload && (
        <BlobProvider
          document={<ReportCardPDF data={activeDownload.reportData} school={school} gradingSystem={gradingSystem} />}
        >
          {({ url, loading }) => (
            <PdfDownloaderModal
              url={url}
              loading={loading}
              fileName={activeDownload.fileName}
              onClose={() => setActiveDownload(null)}
            />
          )}
        </BlobProvider>
      )}

      {activePrint && (
        <BlobProvider
          document={<ReportCardPDF data={activePrint.reportData} school={school} gradingSystem={gradingSystem} />}
        >
          {({ url, loading }) => (
            <PdfPrinterModal
              url={url}
              loading={loading}
              onClose={() => setActivePrint(null)}
            />
          )}
        </BlobProvider>
      )}

      {activeBulkPrint && (
        <BlobProvider
          document={
            <BulkReportPDF
              reportCards={activeBulkPrint.reportCards}
              school={school}
              gradingSystem={gradingSystem}
            />
          }
        >
          {({ url, loading }) => (
            <PdfPrinterModal
              url={url}
              loading={loading}
              onClose={() => setActiveBulkPrint(null)}
              isBulk={true}
              bulkCount={activeBulkPrint.reportCards.length}
            />
          )}
        </BlobProvider>
      )}
    </div>
  );
}

// ── Helper modals ─────────────────────────────────────────────────────────────

function PdfDownloaderModal({
  url, loading, fileName, onClose,
}: {
  url: string | null;
  loading: boolean;
  fileName: string;
  onClose: () => void;
}) {
  // Guard against React StrictMode double-fire
  const downloaded = React.useRef(false);

  useEffect(() => {
    if (!loading && url && !downloaded.current) {
      downloaded.current = true;
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
      } catch (err) {
        console.error("Automatic download failed", err);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, url]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin text-blue-500" /> Generating PDF...</> : "PDF Ready"}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Preparing your report card PDF download. This will only take a moment."
              : "Your download has started. If it didn't start automatically, use the button below."}
          </DialogDescription>
        </DialogHeader>
        {!loading && url && (
          <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
            <Button asChild className="w-full">
              <a href={url} download={fileName} onClick={onClose}>Download PDF</a>
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper component for dynamic PDF print/open
function PdfPrinterModal({
  url,
  loading,
  onClose,
  isBulk = false,
  bulkCount = 0,
}: {
  url: string | null;
  loading: boolean;
  onClose: () => void;
  isBulk?: boolean;
  bulkCount?: number;
}) {
  const opened = React.useRef(false);

  useEffect(() => {
    if (!loading && url && !opened.current) {
      opened.current = true;
      try {
        const newWindow = window.open(url, "_blank");
        if (newWindow) {
          onClose();
        }
      } catch (err) {
        console.error("Automatic print tab opening failed", err);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, url]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                {isBulk ? `Compiling ${bulkCount} reports...` : "Preparing PDF..."}
              </>
            ) : (
              "PDF Compiled successfully"
            )}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? isBulk
                ? `We are compiling all ${bulkCount} report cards into a single PDF document. This may take a few seconds.`
                : "We are preparing your report card PDF for printing. This will only take a moment."
              : "The PDF is ready. If it didn't open in a new tab automatically (blocked by popup blocker), click below."}
          </DialogDescription>
        </DialogHeader>
        {!loading && url && (
          <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
            <Button asChild className="w-full">
              <a href={url} target="_blank" rel="noopener noreferrer" onClick={onClose}>
                Open PDF to Print
              </a>
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
