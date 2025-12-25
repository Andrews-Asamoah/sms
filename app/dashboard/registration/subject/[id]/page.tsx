import { prismadb } from "@/lib/prisma";
import ClassForm from "./_forms/form";
import DashPageWrapper from "@/app/dashboard/_component/pageWrapper";

const Subject = async ({ params: { id } }: { params: { id: string } }) => {
  const Subject = await prismadb.subject.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <DashPageWrapper
      breadcrumbLinks={[
        { link: "/dashboard/registration/subject", linkPage: "Subject" },
      ]}
      currentPage="edit subject">
      <ClassForm initialData={Subject} />
    </DashPageWrapper>
  );
};

export default Subject;
