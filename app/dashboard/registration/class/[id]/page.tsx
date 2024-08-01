import { prismadb } from "@/lib/db";
import ClassForm from "./_forms/form";
import DashPageWrapper from "@/app/dashboard/_component/pageWrapper";

const Class = async ({ params: { id } }: { params: { id: string } }) => {
  const Class = await prismadb.class.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <DashPageWrapper
      breadcrumbLinks={[
        { link: "/dashboard/registration/class", linkPage: "Class" },
      ]}
      currentPage="edit class">
      <ClassForm initialData={Class} />
    </DashPageWrapper>
  );
};

export default Class;
