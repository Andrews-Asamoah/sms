"use client";

import { FiUsers } from "react-icons/fi";
import { ClassesColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table/data-table";
import { TableHeader } from "@/components/ui/table-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface ClassClientProps {
  data: ClassesColumn[];
}

const ClassesClient: React.FC<ClassClientProps> = ({ data }) => {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <TableHeader
          title={`Total Classes (${data.length})`}
          description="Manage all classes in your school"
          onAddNewClick={() => router.push(`/dashboard/registration/class/new`)}
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

export default ClassesClient;
