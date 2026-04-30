// components/school/teachers/teacher-pending-invitations-list.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingInvitationRow } from "@/components/ui/pending-invitation-row";
import { CancelInvitationButton } from "./cancel-invitation-button";
import { Clock } from "lucide-react";

interface PendingTeacher {
  id: string;
  firstName: string | null;
  lastName: string | null;
  invitationEmail: string | null;
  employmentType: string;
  createdAt: Date;
  department: { name: string };
}

interface TeacherPendingInvitationsListProps {
  pendingInvitations: PendingTeacher[];
  schoolSlug: string;
}

export function TeacherPendingInvitationsList({
  pendingInvitations,
  schoolSlug,
}: TeacherPendingInvitationsListProps) {
  if (pendingInvitations.length === 0) return null;

  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50 border-yellow-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          These teachers have been invited but haven&apos;t accepted yet. Their
          profile details will be linked automatically when they sign up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {pendingInvitations.map((pending) => {
            const displayName =
              pending.firstName || pending.lastName
                ? `${pending.firstName ?? ""} ${pending.lastName ?? ""}`.trim()
                : pending.invitationEmail;

            const hasName = Boolean(pending.firstName || pending.lastName);

            return (
              <PendingInvitationRow
                key={pending.id}
                primary={displayName}
                secondary={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {hasName && pending.invitationEmail && (
                      <span>{pending.invitationEmail} •</span>
                    )}
                    <span>{pending.department.name}</span>
                    <span>·</span>
                    <span>{pending.employmentType.replace("_", " ")}</span>
                    <span>·</span>
                    <span>
                      Invited{" "}
                      {new Date(pending.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                }
                badges={
                  <Badge
                    variant="outline"
                    className="text-yellow-600 border-yellow-500/50 shrink-0"
                  >
                    Awaiting signup
                  </Badge>
                }
                action={
                  <CancelInvitationButton
                    schoolSlug={schoolSlug}
                    teacherId={pending.id}
                    email={pending.invitationEmail!}
                  />
                }
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
