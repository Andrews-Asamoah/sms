"use client";

import { useState, useEffect } from "react";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateFeeStructureDialog } from "./create-fee-structure-dialog";
import { DashboardPageHeader } from "@/components/layout/page-header";

type FeeItem = {
  id: string;
  name: string;
  amount: number;
  isOptional: boolean;
};

type FeeStructure = {
  id: string;
  name: string;
  description: string;
  classLevel: string;
  isActive: boolean;
  items: FeeItem[];
  _count: { bills: number };
};

export function FeeStructuresClient() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchStructures = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/schools/${schoolSlug}/finance/fee-structures`,
      );
      if (res.ok) {
        const data = await res.json();
        setStructures(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, [schoolSlug]);

  return (
    <div className="flex-1 space-y-6 flex flex-col pt-6 p-4 md:p-8">
      <DashboardPageHeader
        title="Fee Management"
        description="Configure tuition templates, miscellaneous fees, and their underlying billing items."
      >
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Structure
        </Button>
      </DashboardPageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {structures.map((s) => {
          const totalAmount = s.items.reduce(
            (acc, item) => acc + Number(item.amount),
            0,
          );
          return (
            <Card
              key={s.id}
              className="flex flex-col relative overflow-hidden group"
            >
              <div
                className={`absolute top-0 w-full h-1 ${s.isActive ? "bg-primary" : "bg-muted"}`}
              />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <CardTitle className="leading-tight group-hover:text-primary transition-colors">
                      {s.name}
                    </CardTitle>
                    {s.classLevel && (
                      <Badge
                        variant="secondary"
                        className="font-normal text-xs"
                      >
                        Target: {s.classLevel}
                      </Badge>
                    )}
                  </div>
                  <Badge variant={s.isActive ? "outline" : "secondary"}>
                    {s.isActive ? "Active" : "Archived"}
                  </Badge>
                </div>
                {s.description && (
                  <CardDescription className="line-clamp-2 text-sm mt-2">
                    {s.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1 pb-4 flex flex-col justify-end">
                <div className="space-y-4">
                  <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center border">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase">
                        Base Total
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        GHS{" "}
                        {totalAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground font-medium uppercase">
                        Items
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {s.items.length}
                      </p>
                    </div>
                  </div>

                  {s._count.bills > 0 && (
                    <div className="text-sm font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-md inline-flex items-center w-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                      Applied to {s._count.bills} bills
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {structures.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl bg-muted/30">
            <LayoutGrid className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">
              No Fee Structures
            </h3>
            <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
              Get started by creating your first tuition or fee template for
              student billing.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Structure
            </Button>
          </div>
        )}
      </div>

      {isDialogOpen && (
        <CreateFeeStructureDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={fetchStructures}
        />
      )}
    </div>
  );
}
