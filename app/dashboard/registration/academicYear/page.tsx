import { format } from "date-fns";
import { AcademicYearColumn } from "./_components/columns";
import { prismadb } from "@/lib/prisma";
import DashPageWrapper from "../../_component/pageWrapper";
import AcademicYearClient from "./_components/academicYears";

const AcademicYearPage = async () => {
  const academicYear = await prismadb.academicYear.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedUsers: AcademicYearColumn[] = academicYear.map((item) => ({
    id: item.id,
    name: item.name,
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <DashPageWrapper
      breadcrumbLinks={[
        { link: "/dashboard/registration", linkPage: "registration" },
      ]}
      currentPage="Academic Year">
      <AcademicYearClient data={formattedUsers} />
    </DashPageWrapper>
  );
};

export default AcademicYearPage;
