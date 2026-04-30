"use client";

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Shield, Lock, Pencil, Trash2, Users, CheckCircle2,
  Building2, LayoutGrid, Table2, AlertTriangle, Loader2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CreateRoleDialog, EditRoleDialog } from "./role-dialogs";
import { PermissionMatrix } from "./permission-matrix";
import { getRolesForOrganization, deleteCustomRole } from "./actions";
import type { OrganizationForRoles, RoleForDisplay } from "./actions";

// ─── Role colour map ────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  owner: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30",
  admin: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  headteacher: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  teacher: "from-green-500/20 to-emerald-500/10 border-green-500/30",
  accountant: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
  student: "from-sky-500/20 to-cyan-500/10 border-sky-500/30",
  guardian: "from-orange-500/20 to-amber-500/10 border-orange-500/30",
  member: "from-slate-500/20 to-slate-600/10 border-slate-500/30",
  staff: "from-indigo-500/20 to-violet-500/10 border-indigo-500/30",
};
const CUSTOM_COLOR = "from-rose-500/20 to-pink-500/10 border-rose-500/30";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Shield className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  headteacher: <Shield className="h-4 w-4 text-purple-500" />,
  teacher: <Users className="h-4 w-4 text-green-500" />,
  accountant: <Users className="h-4 w-4 text-emerald-500" />,
  student: <Users className="h-4 w-4 text-sky-500" />,
  guardian: <Users className="h-4 w-4 text-orange-500" />,
  member: <Users className="h-4 w-4 text-slate-500" />,
  staff: <Users className="h-4 w-4 text-indigo-500" />,
};

// ─── Role Card ───────────────────────────────────────────────────────────────
function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: RoleForDisplay;
  onEdit: (r: RoleForDisplay) => void;
  onDelete: (r: RoleForDisplay) => void;
}) {
  const permCount = Object.values(role.permissions).reduce((s, a) => s + a.length, 0);
  const colorClass = role.isStatic
    ? (ROLE_COLORS[role.name] ?? "from-slate-500/20 to-slate-600/10 border-slate-500/30")
    : CUSTOM_COLOR;

  return (
    <Card className={cn(
      "relative group hover:shadow-lg transition-all duration-200 border bg-gradient-to-br overflow-hidden",
      colorClass,
    )}>
      {/* Custom badge */}
      {!role.isStatic && (
        <div className="absolute top-3 right-3">
          <Badge className="text-[10px] bg-rose-500/20 text-rose-400 border-rose-500/30 border">
            Custom
          </Badge>
        </div>
      )}
      {role.isStatic && (
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="text-[10px] gap-1">
            <Lock className="h-2.5 w-2.5" /> System
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3 pr-20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-background/60 backdrop-blur-sm">
            {ROLE_ICONS[role.name] ?? <Shield className="h-4 w-4 text-rose-500" />}
          </div>
          <div>
            <CardTitle className="text-sm">{role.label}</CardTitle>
            <CardDescription className="text-xs mt-0.5 font-mono text-muted-foreground/70">
              {role.name}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {permCount} perms
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {role.memberCount} members
            </span>
          </div>

          {!role.isStatic && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-blue-500/10 hover:text-blue-500"
                onClick={() => onEdit(role)}
                title="Edit permissions"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(role)}
                title="Delete role"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
interface RolesDashboardProps {
  organizations: OrganizationForRoles[];
  initialOrgId: string;
  initialRoles: RoleForDisplay[];
}

export function RolesDashboard({
  organizations,
  initialOrgId,
  initialRoles,
}: RolesDashboardProps) {
  const [selectedOrgId, setSelectedOrgId] = useState(initialOrgId);
  const [roles, setRoles] = useState<RoleForDisplay[]>(initialRoles);
  const [isLoading, startLoading] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleForDisplay | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleForDisplay | null>(null);
  const [matrixRole, setMatrixRole] = useState<RoleForDisplay | null>(null);

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const customRoles = roles.filter((r) => !r.isStatic);
  const staticRoles = roles.filter((r) => r.isStatic);

  const loadRoles = useCallback(
    (orgId: string) => {
      startLoading(async () => {
        const res = await getRolesForOrganization(orgId);
        if (res.data) setRoles(res.data);
        else toast.error(res.error ?? "Failed to load roles");
      });
    },
    []
  );

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    setMatrixRole(null);
    loadRoles(orgId);
  };

  const handleDeleteConfirm = () => {
    if (!deleteRole?.id) return;
    startDeleting(async () => {
      const res = await deleteCustomRole(selectedOrgId, deleteRole.id!);
      if (res.success) {
        toast.success(`Role "${deleteRole.label}" deleted.`);
        setDeleteRole(null);
        loadRoles(selectedOrgId);
      } else {
        toast.error(res.error ?? "Failed to delete role.");
        setDeleteRole(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system roles and create custom roles per school.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadRoles(selectedOrgId)}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={isLoading || customRoles.length >= 10}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Role
            {customRoles.length >= 10 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">Limit reached</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* ── Org Selector ────────────────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Managing school:</span>
            </div>
            <Select value={selectedOrgId} onValueChange={handleOrgChange} disabled={isLoading}>
              <SelectTrigger className="sm:max-w-sm">
                <SelectValue placeholder="Select a school…" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <span>{org.name}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] hidden sm:flex"
                      >
                        {org.subscriptionStatus}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedOrg && (
              <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {selectedOrg.memberCount} members
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span>{staticRoles.length} system + {customRoles.length}/10 custom roles</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="roles">
        <TabsList className="grid grid-cols-2 w-[320px]">
          <TabsTrigger value="roles" className="gap-2">
            <LayoutGrid className="h-3.5 w-3.5" /> Role Cards
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2">
            <Table2 className="h-3.5 w-3.5" /> Permission Matrix
          </TabsTrigger>
        </TabsList>

        {/* ── Role Cards Tab ─────────────────────────────────────────────── */}
        <TabsContent value="roles" className="mt-5 space-y-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* System roles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    System Roles
                  </h2>
                  <Badge variant="outline" className="text-[10px]">{staticRoles.length}</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {staticRoles.map((role) => (
                    <RoleCard
                      key={role.name}
                      role={role}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
              </div>

              {/* Custom roles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Custom Roles
                  </h2>
                  <Badge variant="outline" className="text-[10px]">
                    {customRoles.length}/10
                  </Badge>
                </div>

                {customRoles.length === 0 ? (
                  <Card className="border-dashed border-2 border-border/50">
                    <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
                      <div className="p-3 rounded-full bg-muted/50">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">No custom roles yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Create custom roles tailored to your school&apos;s needs.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCreateOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Role
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {customRoles.map((role) => (
                      <RoleCard
                        key={role.id ?? role.name}
                        role={role}
                        onEdit={setEditRole}
                        onDelete={setDeleteRole}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Permission Matrix Tab ──────────────────────────────────────── */}
        <TabsContent value="matrix" className="mt-5 space-y-4">
          {isLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
              {/* Role list sidebar */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                  Select a role
                </p>
                {roles.map((role) => (
                  <button
                    key={role.id ?? role.name}
                    type="button"
                    onClick={() => setMatrixRole(role)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm",
                      matrixRole?.name === role.name
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted/60 border border-transparent"
                    )}
                  >
                    {ROLE_ICONS[role.name] ?? <Shield className="h-4 w-4 text-rose-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{role.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{role.name}</p>
                    </div>
                    {!role.isStatic && (
                      <Badge className="ml-auto shrink-0 text-[9px] bg-rose-500/10 text-rose-400 border-rose-500/20 border">
                        Custom
                      </Badge>
                    )}
                  </button>
                ))}
              </div>

              {/* Matrix */}
              <div>
                {matrixRole ? (
                  <Card>
                    <CardHeader className="pb-3 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {ROLE_ICONS[matrixRole.name] ?? <Shield className="h-4 w-4 text-rose-500" />}
                          <div>
                            <CardTitle className="text-base">{matrixRole.label}</CardTitle>
                            <CardDescription className="text-xs font-mono">
                              {matrixRole.name}
                              {matrixRole.isStatic && (
                                <Badge variant="outline" className="ml-2 text-[10px] gap-1">
                                  <Lock className="h-2.5 w-2.5" /> Read-only
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        {!matrixRole.isStatic && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditRole(matrixRole)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Edit Permissions
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <PermissionMatrix
                        value={matrixRole.permissions}
                        readonly
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-20 flex flex-col items-center gap-2 text-center">
                      <Table2 className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        Select a role to view its permission matrix
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={selectedOrgId}
        organizationName={selectedOrg?.name ?? ""}
        onSuccess={() => loadRoles(selectedOrgId)}
      />

      {editRole && (
        <EditRoleDialog
          open={!!editRole}
          onOpenChange={(o) => !o && setEditRole(null)}
          role={editRole}
          onSuccess={() => {
            loadRoles(selectedOrgId);
            setEditRole(null);
            if (matrixRole?.name === editRole.name) setMatrixRole(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRole} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Role?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the{" "}
              <span className="font-semibold font-mono">{deleteRole?.name}</span> role.
              {deleteRole && deleteRole.memberCount > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠ {deleteRole.memberCount} member(s) currently have this role and must be reassigned first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</>
              ) : "Delete Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
