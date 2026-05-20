"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRightCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Users,
  BookOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface TermOption {
  id: string;
  name: string;
  termNumber: number;
  isCurrent: boolean;
}

interface TransitionData {
  currentTerm: { id: string; name: string } | null;
  allTerms: TermOption[];
  preview: {
    studentsWithBalance: number;
    totalOutstanding: number;
    activeEnrollmentCount: number;
    teacherAssignmentCount: number;
  } | null;
}

export function TermTransitionCard() {
  const params = useParams();
  const router = useRouter();
  const schoolSlug = params.schoolSlug as string;

  const [data, setData] = useState<TransitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextTermId, setNextTermId] = useState<string>("skip");
  const [carryForwardArrears, setCarryForwardArrears] = useState(true);
  const [executing, setExecuting] = useState(false);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/schools/${schoolSlug}/academics/term-transition`,
      );
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load term transition data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [schoolSlug]);

  const availableNextTerms =
    data?.allTerms.filter((t) => !t.isCurrent) || [];

  const handleTransition = async () => {
    try {
      setExecuting(true);
      const res = await fetch(
        `/api/schools/${schoolSlug}/academics/term-transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nextTermId: nextTermId === "skip" ? undefined : nextTermId,
            carryForwardArrears,
          }),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Transition failed");
      }

      const parts: string[] = [];
      if (result.closedTerm) parts.push(`Closed "${result.closedTerm.name}".`);
      if (result.enrollmentsCloned > 0)
        parts.push(`${result.enrollmentsCloned} enrolment(s) cloned.`);
      if (result.arrearsBillsCreated > 0)
        parts.push(`${result.arrearsBillsCreated} arrears bill(s) created.`);
      if (result.studentsUpdated > 0)
        parts.push(`${result.studentsUpdated} student balance(s) updated.`);

      toast.success(parts.join(" ") || "Transition completed.", {
        duration: 6000,
      });

      // Re-fetch preview and refresh page
      await fetchPreview();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Term transition failed");
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="flex items-center gap-3 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
          <span className="text-sm text-muted-foreground">
            Loading term transition data...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!data?.currentTerm) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            No active term found. Set a current term using the Global Settings
            above before triggering a transition.
          </span>
        </CardContent>
      </Card>
    );
  }

  const hasOutstanding = (data.preview?.studentsWithBalance ?? 0) > 0;
  const enrollmentCount = data.preview?.activeEnrollmentCount ?? 0;
  const teacherCount = data.preview?.teacherAssignmentCount ?? 0;

  return (
    <Card className="border border-amber-500/20 bg-card/60 backdrop-blur-xl shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ArrowRightCircle className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-amber-600 dark:text-amber-400 font-bold">
            Term Transition
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground mt-1">
          Close the current term, clone active enrolments to the next term, and
          carry forward outstanding balances.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current term summary */}
        <div className="flex items-center justify-between p-5 rounded-xl bg-background/40 border border-border/40 shadow-sm backdrop-blur-md">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Current Active Term
            </p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {data.currentTerm.name}
            </p>
          </div>
          {hasOutstanding && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Outstanding Balances
              </p>
              <p className="text-lg font-bold text-orange-500 mt-1">
                {data.preview!.studentsWithBalance} student
                {data.preview!.studentsWithBalance !== 1 ? "s" : ""}
              </p>
              <p className="text-xs font-mono font-medium text-muted-foreground mt-0.5">
                GHS{" "}
                {data.preview!.totalOutstanding.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                total
              </p>
            </div>
          )}
          {!hasOutstanding && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              All Clear
            </Badge>
          )}
        </div>

        {/* Enrolment & Assignment stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors shadow-sm">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="h-5 w-5 shrink-0" />
            </div>
            <div>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400">{enrollmentCount}</p>
              <p className="text-xs text-muted-foreground font-medium">
                Active enrolments to clone
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 hover:bg-violet-500/10 transition-colors shadow-sm">
            <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-500">
              <BookOpen className="h-5 w-5 shrink-0" />
            </div>
            <div>
              <p className="text-base font-bold text-violet-600 dark:text-violet-400">{teacherCount}</p>
              <p className="text-xs text-muted-foreground font-medium">
                Teacher assignments (persist)
              </p>
            </div>
          </div>
        </div>

        {/* Carry-forward note */}
        {hasOutstanding && (
          <div className="flex gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm text-amber-800 dark:text-amber-400/90 shadow-sm">
            <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-500 shrink-0" />
            <span className="leading-relaxed">
              <strong>{data.preview!.studentsWithBalance}</strong> students have
              unpaid bills totalling{" "}
              <strong className="font-semibold text-amber-900 dark:text-amber-300">
                GHS{" "}
                {data.preview!.totalOutstanding.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </strong>
              . These balances will be carried forward automatically.
            </span>
          </div>
        )}

        {/* Next term selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold tracking-tight">
            Activate Next Term (Optional)
          </label>
          <Select value={nextTermId} onValueChange={setNextTermId}>
            <SelectTrigger className="rounded-xl border-border/60 focus:ring-amber-500/20 bg-background/50">
              <SelectValue placeholder="— Skip, just close current term —" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="skip">— Skip —</SelectItem>
              {availableNextTerms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} (Term {t.termNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            If selected, this term will become the new active term and all
            active enrolments will be cloned into it.
          </p>
        </div>

        {/* Arrears toggle */}
        {hasOutstanding && nextTermId !== "skip" && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-background/30 shadow-sm">
            <Checkbox
              id="carry-forward-arrears"
              checked={carryForwardArrears}
              onCheckedChange={(checked) =>
                setCarryForwardArrears(checked === true)
              }
              className="mt-1 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
            />
            <label
              htmlFor="carry-forward-arrears"
              className="text-sm font-semibold cursor-pointer leading-tight"
            >
              Create arrears bills in the new term
              <span className="block text-xs text-muted-foreground font-normal mt-1 leading-relaxed">
                Generates an &quot;Arrears&quot; invoice for each student with
                unpaid balances.
              </span>
            </label>
          </div>
        )}

        {/* Confirm dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/10 font-semibold border-0 transition-all duration-300"
              disabled={executing}
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              Close &quot;{data.currentTerm.name}&quot; &amp; Transition
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">Confirm Term Transition</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground mt-2">
                  <p>
                    You are about to <strong>close</strong>{" "}
                    <span className="text-foreground font-medium">
                      {data.currentTerm.name}
                    </span>
                    . This action will:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1">
                    <li>Mark the current term as inactive.</li>
                    {nextTermId !== "skip" && (
                      <li>
                        Clone <strong>{enrollmentCount}</strong> active
                        enrolment(s) to the next term.
                      </li>
                    )}
                    {hasOutstanding && (
                      <li>
                        Add outstanding bill balances to{" "}
                        <strong>{data.preview!.studentsWithBalance}</strong>{" "}
                        student account(s).
                      </li>
                    )}
                    {hasOutstanding &&
                      carryForwardArrears &&
                      nextTermId !== "skip" && (
                        <li>
                          Create arrears bills in the new term.
                        </li>
                      )}
                    {nextTermId !== "skip" && (
                      <li>
                        Activate{" "}
                        <strong className="text-amber-600 dark:text-amber-400">
                          {availableNextTerms.find((t) => t.id === nextTermId)
                            ?.name || "the selected term"}
                        </strong>{" "}
                        as the new current term.
                      </li>
                    )}
                  </ul>
                  <p className="text-destructive font-medium pt-2 border-t border-border/50">
                    This cannot be undone. Please ensure all data for this term
                    is finalised before proceeding.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2">
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleTransition}
                className="bg-amber-600 hover:bg-amber-700 rounded-xl"
              >
                Confirm Transition
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
