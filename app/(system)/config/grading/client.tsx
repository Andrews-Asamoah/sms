"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SystemGradingDialog } from "@/components/System/grading/system-grading-dialog";
import {
  BookOpen,
  CheckCircle2,
  Info,
  Layers,
  Pencil,
  Scale,
  Trash2,
  XCircle,
} from "lucide-react";

export type SystemGradingScale = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  gradeScales: {
    id: string;
    grade: string;
    description: string;
    minScore: number;
    maxScore: number;
    gradePoint: number;
    displayOrder: number;
  }[];
  _count: {
    gradeScales: number;
    assessmentTemplates: number;
  };
};

interface SystemGradingClientProps {
  data: SystemGradingScale[];
}

export function SystemGradingClient({ data }: SystemGradingClientProps) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<SystemGradingScale | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemGradingScale | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/system/grading/${deleteTarget.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete grading scale");
      }

      toast.success(`"${deleteTarget.name}" deleted successfully`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header row with count + add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl">
              <Scale className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                System Default Scales
              </h2>
              <p className="text-sm text-muted-foreground">
                {data.length} scale{data.length !== 1 ? "s" : ""} available for
                schools to adopt
              </p>
            </div>
          </div>
          <SystemGradingDialog />
        </div>

        {/* Edit dialog (for row-level editing) */}
        {editTarget && (
          <SystemGradingDialog
            gradingSystem={editTarget}
            open={!!editTarget}
            onOpenChange={(open) => !open && setEditTarget(null)}
          />
        )}

        {/* Delete confirmation */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete System Default?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove{" "}
                <strong>&quot;{deleteTarget?.name}&quot;</strong> from the list
                of system defaults. Schools that have already adopted it will
                keep their copy. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Empty state */}
        {data.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-16 text-center gap-4">
            <div className="p-4 bg-purple-500/10 rounded-full">
              <BookOpen className="h-10 w-10 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No system defaults yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                Create your first system-wide grading scale. Schools will be
                able to browse and adopt these templates for their own use.
              </p>
            </div>
            <SystemGradingDialog>
              <Button size="lg" className="mt-2">
                Create First Scale
              </Button>
            </SystemGradingDialog>
          </div>
        )}

        {/* Cards grid */}
        {data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((sys) => (
              <Card
                key={sys.id}
                className="bg-background relative overflow-hidden flex flex-col group border-primary/20 hover:border-primary/50 hover:shadow-md transition-all shadow-sm"
              >
                {/* Left accent bar */}
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/30 group-hover:bg-purple-500 transition-colors" />

                <CardHeader className="pb-3 pl-5">
                  <div className="flex justify-between items-start mb-2">
                    <Badge
                      variant="outline"
                      className="bg-muted font-mono text-xs"
                    >
                      {sys.code}
                    </Badge>
                    <Badge
                      variant={sys.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {sys.isActive ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {sys.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-snug">
                    {sys.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-sm">
                    {sys.description || "No description provided."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-3 pl-5 flex-1">
                  {/* Grade scale preview */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {sys._count.gradeScales} grade levels
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {sys.gradeScales.slice(0, 6).map((gs) => (
                        <Tooltip key={gs.id}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center h-7 min-w-[28px] px-2 rounded-md bg-muted text-xs font-bold border border-border cursor-default">
                              {gs.grade}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <span className="font-semibold">{gs.grade}</span>{" "}
                            — {gs.description} ({gs.minScore}–{gs.maxScore}%)
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {sys.gradeScales.length > 6 && (
                        <span className="inline-flex items-center justify-center h-7 px-2 rounded-md bg-muted text-xs text-muted-foreground border border-dashed">
                          +{sys.gradeScales.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pl-5 pt-3 border-t gap-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    <span>
                      {sys._count.assessmentTemplates} template
                      {sys._count.assessmentTemplates !== 1 ? "s" : ""} using
                      this
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => setEditTarget(sys)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget(sys)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Footer info */}
        {data.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 text-sm text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Schools can view these system defaults in their grading settings
              and adopt any scale they choose. Adoption creates a school-owned
              copy — changes made here do not retroactively affect already
              adopted scales.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
