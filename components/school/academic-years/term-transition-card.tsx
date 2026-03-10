"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRightCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
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
  } | null;
}

export function TermTransitionCard() {
  const params = useParams();
  const router = useRouter();
  const schoolSlug = params.schoolSlug as string;

  const [data, setData] = useState<TransitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextTermId, setNextTermId] = useState<string>("skip");
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
          body: JSON.stringify({ nextTermId: nextTermId === "skip" ? undefined : nextTermId }),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Transition failed");
      }

      toast.success(
        `Term "${result.closedTerm?.name}" closed. ${result.studentsUpdated} student(s) updated with carry-forward balances.`,
        { duration: 5000 },
      );

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
            No active term found. Set a current term using the Global Settings above before triggering a transition.
          </span>
        </CardContent>
      </Card>
    );
  }

  const hasOutstanding = (data.preview?.studentsWithBalance ?? 0) > 0;

  return (
    <Card className="border-2 border-amber-200 bg-amber-50/20">
      <CardHeader className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <ArrowRightCircle className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-amber-900 dark:text-amber-300">
            Term Transition
          </CardTitle>
        </div>
        <CardDescription>
          Close the current term and carry forward outstanding balances to the next term.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        {/* Current term summary */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/60 dark:bg-card border">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Current Active Term
            </p>
            <p className="text-lg font-bold mt-0.5">{data.currentTerm.name}</p>
          </div>
          {hasOutstanding && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Outstanding Balances
              </p>
              <p className="text-lg font-bold text-amber-600 mt-0.5">
                {data.preview!.studentsWithBalance} student
                {data.preview!.studentsWithBalance !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                GHS {data.preview!.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
              </p>
            </div>
          )}
          {!hasOutstanding && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              All Clear
            </Badge>
          )}
        </div>

        {/* Carry-forward note */}
        {hasOutstanding && (
          <div className="flex gap-2 p-3 rounded-md bg-amber-100/50 border border-amber-200 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>{data.preview!.studentsWithBalance}</strong> students have unpaid bills totalling{" "}
              <strong>GHS {data.preview!.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>. These balances will be added to each student&apos;s outstanding balance record.
            </span>
          </div>
        )}

        {/* Next term selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Activate Next Term (Optional)
          </label>
          <Select value={nextTermId} onValueChange={setNextTermId}>
            <SelectTrigger>
              <SelectValue placeholder="— Skip, just close current term —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">— Skip —</SelectItem>
              {availableNextTerms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} (Term {t.termNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            If selected, this term will become the new active term for all users.
          </p>
        </div>

        {/* Confirm dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              disabled={executing}
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              Close &quot;{data.currentTerm.name}&quot; &amp; Carry Forward Balances
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Term Transition</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    You are about to <strong>close</strong>{" "}
                    <span className="text-foreground font-medium">
                      {data.currentTerm.name}
                    </span>
                    . This action will:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Mark the current term as inactive.</li>
                    {hasOutstanding && (
                      <li>
                        Add outstanding bill balances to{" "}
                        <strong>{data.preview!.studentsWithBalance}</strong>{" "}
                        student account(s).
                      </li>
                    )}
                    {nextTermId && (
                      <li>
                        Activate{" "}
                        <strong>
                          {availableNextTerms.find((t) => t.id === nextTermId)
                            ?.name || "the selected term"}
                        </strong>{" "}
                        as the new current term.
                      </li>
                    )}
                  </ul>
                  <p className="text-destructive font-medium pt-1">
                    This cannot be undone. Please ensure all data for this term is finalised before proceeding.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleTransition}
                className="bg-amber-600 hover:bg-amber-700"
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
