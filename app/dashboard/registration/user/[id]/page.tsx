import { prismadb } from "@/lib/db";
import UserForm from "./_forms/form";

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
    <div>
      <UserForm initialData={user} classes={classes} />
    </div>
  );
};

export default User;
