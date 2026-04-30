// components/ui/pending-invitation-row.tsx
import { cn } from "@/lib/utils";

interface PendingInvitationRowProps {
  /** Primary label — name or email */
  primary: React.ReactNode;
  /** Secondary/sub-text line */
  secondary?: React.ReactNode;
  /** Badges or status chips, placed between the text and the action */
  badges?: React.ReactNode;
  /** Action element (button / alert-dialog trigger) */
  action?: React.ReactNode;
  /** Optional extra className for the wrapper */
  className?: string;
  /** Whether this row represents an expired or error state */
  isError?: boolean;
}

/**
 * A mobile-responsive row for pending invitation lists.
 *
 * On mobile the layout stacks: text block on top, badges + action below.
 * On md+ screens it reverts to a single horizontal row.
 */
export function PendingInvitationRow({
  primary,
  secondary,
  badges,
  action,
  className,
  isError = false,
}: PendingInvitationRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-lg border transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between",
        isError &&
          "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800",
        className,
      )}
    >
      {/* Left — text content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="text-sm font-medium leading-snug break-words">
          {primary}
        </div>
        {secondary && (
          <div className="text-xs text-muted-foreground leading-snug break-words">
            {secondary}
          </div>
        )}
      </div>

      {/* Right — badges + optional action */}
      {(badges || action) && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {badges}
          {action}
        </div>
      )}
    </div>
  );
}
