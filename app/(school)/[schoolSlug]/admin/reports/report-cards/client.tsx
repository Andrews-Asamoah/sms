"use client";

import {
  ClipboardList, FileText, CheckCircle2, Clock, Calendar, ChevronRight, MoreVertical, Trash2, Eye, EyeOff, Pencil,
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteReportCardSet, unpublishReportCardSet, updateReportCardSet } from "./sets/[setId]/actions";
import { toast } from "sonner";
import { ReportCardSetDialog } from "@/components/school/reports/report-card-set-dialog"; // Note: Adjust import if not valid, but standard is passed down or used in page. Wait, page handles "New Set", I'll just keep the list.

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
  targetClasses: { class: { name: string } }[];
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

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unpublishId, setUnpublishId] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState(false);
  const [editSet, setEditSet] = useState<ReportCardSet | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const result = await deleteReportCardSet(schoolSlug, deleteId);
      if (result.success) {
        toast.success("Report card set deleted");
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
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Generated
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-200 hover:bg-amber-500/10">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Draft
          </Badge>
        );
    }
  };

  const SetGrid = ({ data }: { data: ReportCardSet[] }) => {
    if (data.length === 0) {
      return (
        <Card className="bg-background/40 backdrop-blur-md border-dashed border-2 py-20 mt-6">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 rotate-3">
              <ClipboardList className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">No Report Card Sets found</CardTitle>
            <CardDescription className="max-w-sm mt-3 text-base">
              There are no report card sets matching this filter.
            </CardDescription>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {data.map((set) => (
          <Card
            key={set.id}
            className="group relative border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors cursor-pointer" onClick={() => router.push(`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}`)} />

            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                {getStatusBadge(set.status)}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground flex items-center bg-muted/50 px-2 py-1 rounded-full cursor-pointer" onClick={() => router.push(`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}`)}>
                    <Calendar className="w-3 h-3 mr-1.5" />
                    {new Date(set.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  
                  {/* Action Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}`)}>
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      {/* Edit — available for DRAFT and GENERATED */}
                      {(set.status === "DRAFT" || set.status === "GENERATED") && (
                        <DropdownMenuItem onClick={() => {
                          setEditSet(set);
                          setEditName(set.name);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit Name
                        </DropdownMenuItem>
                      )}
                      {/* Unpublish — only for PUBLISHED */}
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
              <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1 cursor-pointer" onClick={() => router.push(`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}`)}>
                {set.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => router.push(`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}`)}>
                <Badge variant="secondary" className="bg-primary/5 text-primary font-medium border-none text-[10px] uppercase tracking-wider">
                  {set.academicYear.name}
                </Badge>
                <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium border-none text-[10px] uppercase tracking-wider">
                  {set.term.name}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 cursor-pointer" onClick={() => router.push(`/${schoolSlug}/admin/reports/report-cards/sets/${set.id}`)}>
              <div className="space-y-5">
                <div className="flex justify-between items-start p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-tighter">
                      Target Classes
                    </span>
                    {set.targetClasses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {set.targetClasses.slice(0, 3).map((tc, i) => (
                          <span key={i} className="text-xs font-semibold text-foreground bg-muted rounded px-1.5 py-0.5">
                            {tc.class.name}
                          </span>
                        ))}
                        {set.targetClasses.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{set.targetClasses.length - 3} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="font-bold text-foreground">{set.class?.name ?? "—"}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-tighter">
                      Students
                    </span>
                    <span className="font-bold text-foreground">
                      {set._count.reportCards}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center group/btn py-1 mt-auto">
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
    );
  };

  return (
    <>
      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between gap-4 mb-6">
          <TabsList className="bg-background/50 backdrop-blur-sm border border-border/50 p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All Sets
            </TabsTrigger>
            <TabsTrigger value="published" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Published
            </TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Drafts
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0 outline-none">
          <SetGrid data={sets} />
        </TabsContent>
        <TabsContent value="published" className="mt-0 outline-none">
          <SetGrid data={sets.filter((s) => s.status === "PUBLISHED")} />
        </TabsContent>
        <TabsContent value="draft" className="mt-0 outline-none">
          {/* Fix: use s.status === "DRAFT" instead of s.status === "draft" */}
          <SetGrid data={sets.filter((s) => s.status === "DRAFT" || s.status === "GENERATING" || s.status === "GENERATED")} />
        </TabsContent>
      </Tabs>

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

      {/* Unpublish Confirmation */}
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

      {/* Edit Set Dialog */}
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
