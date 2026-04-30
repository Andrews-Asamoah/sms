"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PermissionMatrix } from "./permission-matrix";
import { createCustomRole, updateCustomRole } from "./actions";
import type { RoleForDisplay } from "./actions";

// ============================================================================
// CREATE ROLE DIALOG
// ============================================================================

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  onSuccess: () => void;
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  onSuccess,
}: CreateRoleDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRoleName("");
      setPermissions({});
      setNameError(null);
    }
  }, [open]);

  const validateName = (name: string) => {
    if (!name) return "Role name is required";
    if (!/^[a-z][a-z0-9-]*$/.test(name))
      return "Lowercase letters, numbers, and hyphens only (must start with a letter)";
    if (name.length < 2) return "Role name must be at least 2 characters";
    if (name.length > 32) return "Role name must be at most 32 characters";
    const reserved = [
      "owner", "admin", "member", "teacher", "headteacher",
      "accountant", "student", "guardian", "staff", "superadmin", "user",
    ];
    if (reserved.includes(name)) return "This name is reserved. Choose a different one.";
    return null;
  };

  const permissionCount = Object.values(permissions).reduce(
    (s, acts) => s + acts.length,
    0
  );

  const handleSubmit = () => {
    const error = validateName(roleName);
    if (error) {
      setNameError(error);
      return;
    }
    if (permissionCount === 0) {
      toast.error("Please enable at least one permission for this role.");
      return;
    }
    startTransition(async () => {
      const result = await createCustomRole(organizationId, roleName, permissions);
      if (result.success) {
        toast.success(`Role "${roleName}" created successfully.`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error ?? "Failed to create role.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Key scroll fix:
        - Set an explicit height on DialogContent (h-[90vh]) so flex children
          have a real parent height to fill.
        - overflow-hidden clips the content itself; scrolling is handled
          by the inner overflow-y-auto div.
      */}
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Fixed header ─────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Create Custom Role</DialogTitle>
              <DialogDescription className="mt-0.5">
                New role for{" "}
                <span className="font-medium text-foreground truncate">
                  {organizationName}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable body — native overflow, not ScrollArea ─────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-5 space-y-6">

            {/* Role Name */}
            <div className="space-y-2">
              <Label htmlFor="create-role-name" className="text-sm font-medium">
                Role Name
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="create-role-name"
                  placeholder="e.g. librarian, lab-assistant"
                  value={roleName}
                  onChange={(e) => {
                    setRoleName(e.target.value.toLowerCase());
                    setNameError(null);
                  }}
                  className={nameError ? "border-destructive focus-visible:ring-destructive" : ""}
                  disabled={isPending}
                  autoComplete="off"
                />
                {roleName && !nameError && (
                  <Badge variant="outline" className="shrink-0 font-mono text-xs">
                    {roleName}
                  </Badge>
                )}
              </div>
              {nameError && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {nameError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only. Visible to admins internally.
              </p>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Permissions</Label>
                {permissionCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {permissionCount} enabled
                  </Badge>
                )}
              </div>
              <PermissionMatrix value={permissions} onChange={setPermissions} />
              {/* Bottom padding so last category isn't flush against footer */}
              <div className="h-2" />
            </div>
          </div>
        </div>

        {/* ── Fixed footer ─────────────────────────────────────────────── */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0 bg-background">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// EDIT ROLE DIALOG
// ============================================================================

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleForDisplay;
  onSuccess: () => void;
}

export function EditRoleDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: EditRoleDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [permissions, setPermissions] = useState<Record<string, string[]>>(
    role.permissions
  );

  useEffect(() => {
    setPermissions(role.permissions);
  }, [role]);

  const permissionCount = Object.values(permissions).reduce(
    (s, acts) => s + acts.length,
    0
  );

  const handleSubmit = () => {
    if (permissionCount === 0) {
      toast.error("Please enable at least one permission.");
      return;
    }
    if (!role.id) return;
    startTransition(async () => {
      const result = await updateCustomRole(
        role.organizationId,
        role.id!,
        role.name,
        permissions
      );
      if (result.success) {
        toast.success(`Role "${role.label}" updated successfully.`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error ?? "Failed to update role.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Fixed header ─────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
              <Pencil className="h-5 w-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Edit Role — {role.label}</DialogTitle>
              <DialogDescription className="mt-0.5">
                Update permissions for this custom role.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-5 space-y-5">
            {/* Role info strip */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
              <div className="min-w-0">
                <p className="text-sm font-medium font-mono truncate">{role.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {role.memberCount} member{role.memberCount !== 1 ? "s" : ""} with this role
                </p>
              </div>
              {permissionCount > 0 && (
                <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
                  {permissionCount} permissions
                </Badge>
              )}
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Permissions</Label>
              <PermissionMatrix value={permissions} onChange={setPermissions} />
              <div className="h-2" />
            </div>
          </div>
        </div>

        {/* ── Fixed footer ─────────────────────────────────────────────── */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0 bg-background">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
