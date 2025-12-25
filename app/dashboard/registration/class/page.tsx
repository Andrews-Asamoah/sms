import { format } from "date-fns";
import { ClassesColumn } from "./_components/columns";
import { prismadb } from "@/lib/prisma";
import ClassesClient from "./_components/classes";
import DashPageWrapper from "../../_component/pageWrapper";

const WorkersPage = async () => {
  const classes = await prismadb.class.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedUsers: ClassesColumn[] = classes.map((item) => ({
    id: item.id,
    name: item.name,
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <DashPageWrapper
      breadcrumbLinks={[
        { link: "/dashboard/registration", linkPage: "registration" },
      ]}
      currentPage="class">
      <ClassesClient data={formattedUsers} />
    </DashPageWrapper>
  );
};

export default WorkersPage;
