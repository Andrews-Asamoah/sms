"use client";

import {
  ClipboardList, FileText, CheckCircle2, Clock, Calendar,
  ChevronRight, MoreVertical, Trash2, Eye, EyeOff, Pencil,
  Search, X, GraduationCap, Layers, SlidersHorizontal,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteReportCardSet, unpublishReportCardSet, updateReportCardSet } from "./sets/[setId]/actions";
import { toast } from "sonner";

interface ReportCardSet {
  id: string;
  name: string;
  status: string;
  publishAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  academicYear: { name: string };
  term: { name: string };
  class?: { name: string } | null;
  targetClasses: { class: { id: string; name: string } }[];
  _count: { reportCards: number };
  academicYearId: string;
  termId: string;
  classId?: string | null;
}

interface ReportCardsClientProps {
  initialData: any[];
  schoolSlug: string;
  academicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
  terms: Array<{ id: string; name: string; academicYearId: string }>;
  classes: Array<{ id: string; name: string; department?: { id: string; name: string } | null }>;
}

export function ReportCardsClient({
  initialData,
  schoolSlug,
  academicYears,
  terms,
  classes,
}: ReportCardsClientProps) {
  const router = useRouter();
  const sets = initialData as ReportCardSet[];

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unpublishId, setUnpublishId] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState(false);
  const [editSet, setEditSet] = useState<ReportCardSet | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  // Filters
  const currentYear = academicYears.find((y) => y.isCurrent);
  const [search, setSearch] = useState("");
  const [selectedYearId, setSelectedYearId] = useState<string>(currentYear?.id || "all");
  const [selectedTermId, setSelectedTermId] = useState<string>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const result = await deleteReportCardSet(schoolSlug, deleteId);
      if (result.success) {
        toast.success("Report card set deleted");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleUnpublish = async () => {
    if (!unpublishId) return;
    setUnpublishing(true);
    try {
      const result = await unpublishReportCardSet(schoolSlug, unpublishId);
      if (result.success) {
        toast.success("Report card set unpublished — results are now hidden from parents.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to unpublish");
      }
    } finally {
      setUnpublishing(false);
      setUnpublishId(null);
    }
  };

  const handleEditSet = async () => {
    if (!editSet || !editName.trim()) return;
    setEditing(true);
    try {
      const result = await updateReportCardSet(schoolSlug, editSet.id, { name: editName });
      if (result.success) {
        toast.success("Report card set updated");
        router.refresh();
        setEditSet(null);
      } else {
        toast.error(result.error ?? "Failed to update report card set");
      }
    } finally {
      setEditing(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedYearId(currentYear?.id || "all");
    setSelectedTermId("all");
    setSelectedClassId("all");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-200/50 hover:bg-emerald-500/20 transition-colors text-[11px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Published
          </Badge>
        );
      case "GENERATED":
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border border-blue-200/50 hover:bg-blue-500/20 transition-colors text-[11px]">
            <FileText className="w-3 h-3 mr-1" /> Generated
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border border-amber-200/50 hover:bg-amber-500/10 transition-colors text-[11px]">
            <Clock className="w-3 h-3 mr-1" /> Draft
          </Badge>
        );
    }
  };

  // Filter logic
  const filteredSets = sets.filter((set) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const hit =
        set.name.toLowerCase().includes(q) ||
        set.academicYear.name.toLowerCase().includes(q) ||
        set.term.name.toLowerCase().includes(q) ||
        set.class?.name.toLowerCase().includes(q) ||
        set.targetClasses.some((tc) => tc.class.name.toLowerCase().includes(q));
      if (!hit) return false;
    }
    if (selectedYearId !== "all" && set.academicYearId !== selectedYearId) return false;
    if (selectedTermId !== "all" && set.termId !== selectedTermId) return false;
    if (selectedClassId !== "all") {
      const hasClass =
        set.classId === selectedClassId ||
        set.targetClasses.some((tc) => tc.class.id === selectedClassId);
      if (!hasClass) return false;
    }
    return true;
  });

  const isFilterActive =
    search !== "" ||
    selectedYearId !== (currentYear?.id || "all") ||
    selectedTermId !== "all" ||
    selectedClassId !== "all";

  const activeFilterCount = [
    search !== "",
    selectedYearId !== (currentYear?.id || "all"),
    selectedTermId !== "all",
    selectedClassId !== "all",
  ].filter(Boolean).length;

  const allCount = filteredSets.length;
  const publishedCount = filteredSets.filter((s) => s.status === "PUBLISHED").length;
  const draftCount = filteredSets.filter(
    (s) => s.status === "DRAFT" || s.status === "GENERATING" || s.status === "GENERATED"
  ).length;

  // The filter controls — shared between inline and sheet
  const FilterControls = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, year or class..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-background/60 border-border/60 focus:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
      </div>

      {/* Selects */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Academic Year */}
        <Select
          value={selectedYearId}
          onValueChange={(val) => { setSelectedYearId(val); setSelectedTermId("all"); }}
        >
          <SelectTrigger className="bg-background/60 border-border/60 w-full">
            <div className="flex items-center min-w-0">
              <Calendar className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
              <SelectValue>
                <span className="truncate">
                  {selectedYearId === "all"
                    ? "All Years"
                    : (academicYears.find((y) => y.id === selectedYearId)?.name ?? "") +
                      (academicYears.find((y) => y.id === selectedYearId)?.isCurrent ? " (Current)" : "")}
                </span>
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Academic Years</SelectItem>
            {academicYears.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.name}{year.isCurrent ? " (Current)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Term */}
        <Select value={selectedTermId} onValueChange={setSelectedTermId} disabled={selectedYearId === "all"}>
          <SelectTrigger className="bg-background/60 border-border/60 w-full">
            <div className="flex items-center min-w-0">
              <Layers className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
              <SelectValue>
                <span className="truncate">
                  {selectedTermId === "all" ? "All Terms" : terms.find((t) => t.id === selectedTermId)?.name}
                </span>
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            {terms
              .filter((t) => t.academicYearId === selectedYearId)
              .map((term) => (
                <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Class */}
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="bg-background/60 border-border/60 w-full">
            <div className="flex items-center min-w-0">
              <GraduationCap className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
              <SelectValue>
                <span className="truncate">
                  {selectedClassId === "all" ? "All Classes" : classes.find((c) => c.id === selectedClassId)?.name}
                </span>
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFilterActive && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full sm:w-auto">
          <X className="w-3.5 h-3.5" /> Reset filters
        </Button>
      )}
    </div>
  );

  const SetGrid = ({ data }: { data: ReportCardSet[] }) => {
    if (data.length === 0) {
      return (
        <Card className="bg-background/40 backdrop-blur-md border-dashed border-2 py-16 mt-4">
          <CardContent className="flex flex-col items-center justify-center text-center px-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 rotate-3">
              <ClipboardList className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">No Report Card Sets found</CardTitle>
            <CardDescription className="max-w-sm mt-2 text-sm sm:text-base">
              {isFilterActive
                ? "No sets match your current filters. Try adjusting or resetting them."
                : "Create your first report card set to get started."}
            </CardDescription>
            {isFilterActive && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4 gap-1.5">
                <X className="w-3.5 h-3.5" /> Reset Filters
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-4">
        {data.map((set) => (
          <Card
            key={set.id}
            className="group relative border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer active:scale-[0.99]"
            onClick={() => router.push(`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}`)}
          >
            {/* Left accent bar */}
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover:bg-primary transition-colors" />

            <CardHeader className="pb-3 pl-5">
              {/* Status + date + menu row */}
              <div className="flex items-center justify-between mb-3">
                {getStatusBadge(set.status)}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] font-medium text-muted-foreground hidden sm:flex items-center bg-muted/60 px-2 py-0.5 rounded-full border border-border/20">
                    <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                    {new Date(set.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted/80">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}`)}>
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      {(set.status === "DRAFT" || set.status === "GENERATED") && (
                        <DropdownMenuItem onClick={() => { setEditSet(set); setEditName(set.name); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit Name
                        </DropdownMenuItem>
                      )}
                      {set.status === "PUBLISHED" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-amber-600 focus:text-amber-700 focus:bg-amber-50"
                            onClick={() => setUnpublishId(set.id)}
                          >
                            <EyeOff className="w-4 h-4 mr-2" /> Unpublish
                          </DropdownMenuItem>
                        </>
                      )}
                      {set.status === "DRAFT" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(set.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Set
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Set name */}
              <CardTitle className="text-base sm:text-lg font-bold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                {set.name}
              </CardTitle>

              {/* Year + term badges */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <Badge variant="secondary" className="bg-primary/5 text-primary border border-primary/10 font-bold text-[10px] uppercase tracking-wider">
                  {set.academicYear.name}
                </Badge>
                <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border/50 font-bold text-[10px] uppercase tracking-wider">
                  {set.term.name}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 pl-5 pb-4">
              {/* Target classes + student count */}
              <div className="flex justify-between items-start p-3 rounded-xl bg-muted/30 border border-border/40">
                <div className="flex flex-col gap-1 flex-1 min-w-0 mr-3">
                  <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">
                    Target Classes
                  </span>
                  {set.targetClasses.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {set.targetClasses.slice(0, 3).map((tc, i) => (
                        <span key={i} className="text-[11px] font-semibold text-foreground bg-muted border rounded px-1.5 py-0.5">
                          {tc.class.name}
                        </span>
                      ))}
                      {set.targetClasses.length > 3 && (
                        <span className="text-[11px] text-muted-foreground font-medium self-center">
                          +{set.targetClasses.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-bold text-sm text-foreground mt-0.5">{set.class?.name ?? "—"}</span>
                  )}
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Students</span>
                  <span className="font-black text-xl text-foreground mt-0.5">{set._count.reportCards}</span>
                </div>
              </div>

              {/* Bottom CTA row */}
              <div className="flex justify-between items-center mt-3">
                <p className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
                  Manage results
                </p>
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 transition-all duration-300">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* ── Filter area ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Mobile: search + filter sheet trigger in one row */}
        <div className="flex gap-2 sm:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/60 border-border/60 focus:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative shrink-0 border-border/60">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[85vh] overflow-y-auto">
              <SheetHeader className="mb-4 text-left">
                <SheetTitle>Filter Report Sets</SheetTitle>
              </SheetHeader>
              <FilterControls />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: full filter bar */}
        <div className="hidden sm:block bg-background/50 backdrop-blur-sm border border-border/40 p-4 rounded-2xl shadow-sm">
          <FilterControls />
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between gap-3 mb-2">
          <TabsList className="bg-background/50 backdrop-blur-sm border border-border/50 p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs sm:text-sm h-8">
              All
              <span className="text-[10px] font-black bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{allCount}</span>
            </TabsTrigger>
            <TabsTrigger value="published" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs sm:text-sm h-8">
              Published
              <span className="text-[10px] font-black bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{publishedCount}</span>
            </TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs sm:text-sm h-8">
              Drafts
              <span className="text-[10px] font-black bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{draftCount}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0 outline-none">
          <SetGrid data={filteredSets} />
        </TabsContent>
        <TabsContent value="published" className="mt-0 outline-none">
          <SetGrid data={filteredSets.filter((s) => s.status === "PUBLISHED")} />
        </TabsContent>
        <TabsContent value="draft" className="mt-0 outline-none">
          <SetGrid data={filteredSets.filter((s) => s.status === "DRAFT" || s.status === "GENERATING" || s.status === "GENERATED")} />
        </TabsContent>
      </Tabs>

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report Card Set?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report card set? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Yes, delete it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Unpublish confirmation ────────────────────────────────────── */}
      <AlertDialog open={!!unpublishId} onOpenChange={(open) => !open && setUnpublishId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Report Card Set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the results from parents and guardians. The report cards will remain
              in <strong>Generated</strong> status and can be re-published at any time.
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

      {/* ── Edit set dialog ───────────────────────────────────────────── */}
      <Dialog open={!!editSet} onOpenChange={(open) => !open && setEditSet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Report Card Set</DialogTitle>
            <DialogDescription>
              Rename this report card set. Results are not regenerated.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Name</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={editing}
              placeholder="e.g. End of First Term Report"
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSet(null)} disabled={editing}>Cancel</Button>
            <Button onClick={handleEditSet} disabled={editing || !editName.trim()}>
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
