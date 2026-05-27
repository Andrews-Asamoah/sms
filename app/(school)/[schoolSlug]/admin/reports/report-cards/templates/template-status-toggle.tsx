"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toggleTemplateStatus } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface TemplateStatusToggleProps {
  templateId: string;
  schoolSlug: string;
  initialActive: boolean;
}

export function TemplateStatusToggle({
  templateId,
  schoolSlug,
  initialActive,
}: TemplateStatusToggleProps) {
  const [isActive, setIsActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    try {
      await toggleTemplateStatus(templateId, schoolSlug);
      setIsActive(!isActive);
      toast.success(`Template ${!isActive ? "activated" : "deactivated"} successfully`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle template status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="focus:outline-none transition-transform active:scale-95 disabled:pointer-events-none"
      title={isActive ? "Click to deactivate template" : "Click to activate template"}
    >
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 text-[10px] font-bold px-2 py-0.5 gap-1 cursor-pointer transition-colors select-none",
          loading && "opacity-75",
          isActive
            ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/25 dark:text-emerald-400"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {loading ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        ) : isActive ? (
          <CheckCircle2 className="h-2.5 w-2.5" />
        ) : (
          <XCircle className="h-2.5 w-2.5" />
        )}
        {isActive ? "Active" : "Inactive"}
      </Badge>
    </button>
  );
}
