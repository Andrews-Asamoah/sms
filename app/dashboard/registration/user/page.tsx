import { format } from "date-fns";
import { UsersColumn } from "./_components/columns";
import { prismadb } from "@/lib/db";
import UsersClient from "./_components/users";

const WorkersPage = async () => {
  const users = await prismadb.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedUsers: UsersColumn[] = users.map((item) => ({
    id: item.id,
    firstName: item.firstName,
    lastName: item.lastName,
    otherNames: item.otherNames,
    username: item.username,
    email: item.email,
    phone: item.phone,
    image: item.image,
    role: item.role,
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <div className="">
      <UsersClient data={formattedUsers} />
    </div>
  );
};

export default WorkersPage;
