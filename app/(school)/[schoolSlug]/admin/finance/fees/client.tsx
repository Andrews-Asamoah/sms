"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { NavPermissions } from "@/lib/auth/types";
import { FeeStructureSheet } from "@/components/school/finance/fee-structure-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";

type FeeStructure = {
  id: string;
  name: string;
  description: string;
  classLevel: string;
  isActive: boolean;
  _count: { bills: number };
  items: { id: string; name: string; amount: number }[];
};

interface FeesClientProps {
  permissions: NavPermissions;
  isSuperAdmin: boolean;
}

export default function FeesClient({
  permissions,
  isSuperAdmin,
}: FeesClientProps) {
  const params = useParams();
  const router = useRouter();
  const schoolSlug = params.schoolSlug as string;
  const [data, setData] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [deletingFee, setDeletingFee] = useState<FeeStructure | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/finance/fee-structures`,
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch fee structures:", error);
      toast.error("Failed to load fee structures");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolSlug]);

  const handleDelete = async () => {
    if (!deletingFee) return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/finance/fee-structures/${deletingFee.id}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete");
      }

      const result = await res.json();
      toast.success("Success", {
        description: result.message || "Fee structure deleted successfully",
      });

      fetchData();
      setDeletingFee(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error("Error", { description: errorMessage });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<FeeStructure>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <span className="text-xs text-muted-foreground">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "classLevel",
      header: "Class Level",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.classLevel || "All Levels"}
        </Badge>
      ),
    },
    {
      header: "Total Amount",
      cell: ({ row }) => {
        const total = row.original.items.reduce(
          (sum, item) => sum + Number(item.amount),
          0,
        );
        return (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            GHS {total.toFixed(2)}
          </span>
        );
      },
    },
    {
      header: "Fee Items",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.items.length} items
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "default" : "secondary"}
          className={
            row.original.isActive
              ? "bg-emerald-500 hover:bg-emerald-600"
              : "bg-slate-400"
          }
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Bills Generated",
      cell: ({ row }) => (
        <span className="text-sm">{row.original._count.bills}</span>
      ),
    },
  ];

  // Add actions column if user has manage permissions
  if (permissions.canManageFinance) {
    columns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const fee = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditingFee(fee)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {isSuperAdmin && (
                <DropdownMenuItem
                  onClick={() => setDeletingFee(fee)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient */}
      <div className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/20 dark:via-background dark:to-blue-950/20 p-5">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 ring-1 ring-emerald-500/20">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Fee Structures
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage fee templates and billing configurations
              </p>
            </div>
          </div>
          {permissions.canManageFinance && (
            <FeeStructureSheet
              schoolSlug={schoolSlug}
              onSuccess={fetchData}
              trigger={
                <Button className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-500/20 transition-all hover:shadow-lg hover:shadow-emerald-500/30">
                  <Plus className="mr-2 h-4 w-4" />
                  New Fee Structure
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Enhanced Table Container */}
      <div className="rounded-lg border bg-card shadow-sm">
        <DataTable columns={columns} data={data} searchKey="name" />
      </div>

      {/* Edit Dialog */}
      {editingFee && (
        <FeeStructureSheet
          schoolSlug={schoolSlug}
          feeStructure={editingFee}
          onSuccess={() => {
            fetchData();
            setEditingFee(null);
          }}
          open={!!editingFee}
          onOpenChange={(open) => !open && setEditingFee(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingFee}
        onOpenChange={(open) => !open && setDeletingFee(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the fee structure "{deletingFee?.name}".
              {deletingFee?._count.bills && deletingFee._count.bills > 0 ? (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                  Note: This fee structure has {deletingFee._count.bills}{" "}
                  associated bill(s). It will be deactivated instead of
                  permanently deleted.
                </span>
              ) : (
                <span className="block mt-2 text-red-600 dark:text-red-400 font-medium">
                  This action cannot be undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
