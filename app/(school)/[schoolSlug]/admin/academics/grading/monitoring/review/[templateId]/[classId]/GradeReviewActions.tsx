"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { finalizeGrades, revertGradesToDraft } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GradeReviewActionsProps {
  schoolSlug: string;
  templateId: string;
  classId: string;
  hasSubmitted: boolean;
}

export function GradeReviewActions({
  schoolSlug,
  templateId,
  classId,
  hasSubmitted
}: GradeReviewActionsProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function onFinalize() {
    setIsPending(true);
    try {
      const result = await finalizeGrades(schoolSlug, templateId, classId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  async function onRevert() {
    setIsPending(true);
    try {
      const result = await revertGradesToDraft(schoolSlug, templateId, classId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        onClick={onRevert} 
        disabled={isPending || !hasSubmitted}
        className="text-amber-600 hover:text-amber-700"
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
        Revert to Draft
      </Button>
      <Button 
        variant="default" 
        onClick={onFinalize} 
        disabled={isPending || !hasSubmitted}
        className="bg-green-600 hover:bg-green-700"
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
        Finalize All
      </Button>
    </div>
  );
}
