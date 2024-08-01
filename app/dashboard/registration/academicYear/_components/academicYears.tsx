"use client";

import { FiUsers } from "react-icons/fi";
import { AcademicYearColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table/data-table";
import { TableHeader } from "@/components/ui/table-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface AcademicYearClientProps {
  data: AcademicYearColumn[];
}

const AcademicYearClient: React.FC<AcademicYearClientProps> = ({ data }) => {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <TableHeader
          title={`Total Academic Years (${data.length})`}
          description="Manage all Academic Years in your school"
          onAddNewClick={() =>
            router.push(`/dashboard/registration/academicYear/new`)
          }
          iconColor="text-orange-500"
          bgColor="bg-orange-500/10"
          icon={FiUsers}
        />
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data} searchKey="name" />
      </CardContent>
    </Card>
  );
};

export default AcademicYearClient;
