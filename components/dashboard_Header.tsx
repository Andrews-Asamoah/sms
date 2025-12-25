import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { FaChevronDown } from "react-icons/fa6";
import AcademicYearSwitcher from "./academicYearSwitcher";
import { prismadb } from "@/lib/prisma";
import UserButton from "./auth/user-button";

const DashboardHeader = async () => {
  const academicYears = await prismadb.academicYear.findMany({
    orderBy: { createdAt: "desc" },
  });
  return (
    <Card className="flex items-center justify-between py-2 px-3 bg-white">
      <div className="flex gap-2 items-center">
        <h1>Academic Year:</h1>
        <AcademicYearSwitcher items={academicYears} />
      </div>
      <UserButton />
    </Card>
  );
};

export default DashboardHeader;
