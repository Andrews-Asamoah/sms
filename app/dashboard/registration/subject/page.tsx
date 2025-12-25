import { format } from "date-fns";
import { SubjectsColumn } from "./_components/columns";
import { prismadb } from "@/lib/prisma";
import ClassesClient from "./_components/subjects";
import DashPageWrapper from "../../_component/pageWrapper";

const SubjectPage = async () => {
  const subjects = await prismadb.subject.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedSubjects: SubjectsColumn[] = subjects.map((item) => ({
    id: item.id,
    name: item.name,
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <DashPageWrapper
      breadcrumbLinks={[
        { link: "/dashboard/registration", linkPage: "registration" },
      ]}
      currentPage="subjects">
      <ClassesClient data={formattedSubjects} />
    </DashPageWrapper>
  );
};

export default SubjectPage;
