import { prismadb } from "@/lib/db";
import UserForm from "./_forms/form";
import DashPageWrapper from "@/app/dashboard/_component/pageWrapper";

const User = async ({ params: { id } }: { params: { id: string } }) => {
  const user = await prismadb.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      otherNames: true,
      email: true,
      phone: true,
      dob: true,
      location: true,
      role: true,
      gender: true,
      Student: {
        select: {
          classId: true,
          fathersName: true,
          mothersName: true,
          fathersPhone: true,
          mothersPhone: true,
          guardiansName: true,
          guardiansPhone: true,
        },
      },
    },
  });

  const classes = await prismadb.class.findMany();

  return (
    <DashPageWrapper currentPage="User Management">
      <UserForm initialData={user} classes={classes} />
    </DashPageWrapper>
  );
};

export default User;
