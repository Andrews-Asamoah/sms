"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Home, AlertCircle } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { HouseDetails } from "@/components/school/teacher/house-details";
import { 
    Alert, 
    AlertDescription, 
    AlertTitle 
} from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export default function TeacherHousePage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [house, setHouse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHouse = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/schools/${schoolSlug}/teacher/house`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("You are not assigned as a House Master for any house.");
          } else {
            throw new Error("Failed to fetch house details");
          }
          return;
        }
        const data = await response.json();
        setHouse(data);
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching house details.");
      } finally {
        setLoading(false);
      }
    };

    fetchHouse();
  }, [schoolSlug]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !house) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>{error || "No house details available."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const studentColumns: ColumnDef<any>[] = [
    {
      accessorKey: "studentId",
      header: "Student ID",
    },
    {
      header: "Name",
      cell: ({ row }) => `${row.original.profile.firstName} ${row.original.profile.lastName}`,
    },
    {
      accessorKey: "class.name",
      header: "Class",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge variant={row.original.status === "ACTIVE" ? "outline" : "secondary"}>
                {row.original.status}
            </Badge>
        )
    }
  ];

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title={`My House: ${house.name}`}
        description={`Manage the details and students of ${house.name} House.`}
      />

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">House Details</TabsTrigger>
          <TabsTrigger value="students">Students List</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-4">
          <HouseDetails house={house} schoolSlug={schoolSlug} />
        </TabsContent>
        <TabsContent value="students" className="space-y-4">
           <div className="rounded-md border bg-card/40 backdrop-blur-sm p-4">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Allocated Students</h3>
                <Badge variant="secondary">{house._count?.students || 0} Total</Badge>
             </div>
             <DataTable 
                columns={studentColumns} 
                data={house.students || []} 
                searchKey="studentId" 
                exportTitle={`${house.name} House Students Report`}
             />
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
