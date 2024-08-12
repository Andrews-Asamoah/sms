import DashboardHeader from "@/components/dashboard_Header";
import SideNavBar from "@/components/sideNavBar";
import { Card } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { prismadb } from "@/lib/db";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

const DashboardLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { academicYearId: string };
}) => {
  const academicYear = await prismadb.academicYear.findFirst({
    where: { id: params.academicYearId },
  });

  // if (!academicYear) {
  //   redirect("/");
  // }

  return (
    <TooltipProvider>
      <div className="w-full h-full flex p-3 gap-3 bg-slate-200">
        {/* Sidebar*/}
        <SideNavBar />
        {/* main page */}
        <Card className="flex-1 flex-col p-3 h-full overflow-x-hidden gap-3 bg-slate-50">
          <div className="">
            <DashboardHeader />
          </div>
          <Toaster />
          <div className="">{children}</div>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default DashboardLayout;
