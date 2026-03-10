"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns, GradingSystem } from "@/components/school/grading/columns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyPlus, Info } from "lucide-react";
import { adoptSystemDefaultGrading } from "./actions";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GradingSystemsClientProps {
  data: GradingSystem[];
  systemDefaults: GradingSystem[];
  schoolSlug: string;
}

export function GradingSystemsClient({
  data,
  systemDefaults,
  schoolSlug,
}: GradingSystemsClientProps) {
  const router = useRouter();
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  const handleAdopt = async (id: string) => {
    setAdoptingId(id);
    try {
      const result = await adoptSystemDefaultGrading(schoolSlug, id);
      if (result.success) {
        toast.success("Default system adopted successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to adopt system");
      }
    } finally {
      setAdoptingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Recommended System Defaults */}
      {systemDefaults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">System Default Systems</h2>
            <Badge variant="secondary" className="font-normal text-muted-foreground">
              <Info className="w-3 h-3 mr-1" />
              Adopt these to use them in your school
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemDefaults.map((sys) => {
              const isAlreadyAdopted = data.some((d) => d.code === sys.code);
              return (
                <Card key={sys.id} className="bg-background relative overflow-hidden flex flex-col group border-primary/20 hover:border-primary/50 transition-colors shadow-sm">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="bg-muted">
                        {sys.code}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{sys.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {sys.description || "A standard grading system"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{sys._count.gradeScales} grade levels</span>
                    </div>
                    <Button 
                      className="w-full" 
                      variant={isAlreadyAdopted ? "secondary" : "default"}
                      disabled={isAlreadyAdopted || adoptingId === sys.id}
                      onClick={() => handleAdopt(sys.id)}
                    >
                      <CopyPlus className="w-4 h-4 mr-2" />
                      {adoptingId === sys.id ? "Adopting..." : isAlreadyAdopted ? "Already Adopted" : "Adopt System"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Active Grading Systems</h2>
        <div className="bg-background rounded-lg border shadow-sm p-4">
          <DataTable columns={columns(schoolSlug)} data={data} searchKey="name" exportTitle="Grading Systems Report" />
        </div>
      </div>
    </div>
  );
}
