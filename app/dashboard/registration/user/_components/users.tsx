"use client";

import { FiUsers } from "react-icons/fi";
import { UsersColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table/data-table";
import { TableHeader } from "@/components/ui/table-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface UserClientProps {
  data: UsersColumn[];
}

const UsersClient: React.FC<UserClientProps> = ({ data }) => {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <TableHeader
          title={`Total Population (${data.length})`}
          description="Manage all users in your school"
          onAddNewClick={() => router.push(`/dashboard/registration/user/new`)}
          iconColor="text-orange-500"
          bgColor="bg-orange-500/10"
          icon={FiUsers}
        />
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data} searchKey="firstName" />
      </CardContent>
    </Card>
  );
};

export default UsersClient;
