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
      location: true,
      role: true,
    },
  });

  return (
    <div>
      <UserForm initialData={user} />
    </div>
  );
};

export default User;
