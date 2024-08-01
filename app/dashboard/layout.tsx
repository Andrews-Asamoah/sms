import DashboardHeader from "@/components/dashboard_Header";
import SideNavBar from "@/components/sideNavBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const DashboardLayout = async ({
  children,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) => {
  return (
    <TooltipProvider>
      <div className="w-full h-full flex">
        {/* Sidebar*/}
        <SideNavBar />
        {/* main page */}
        <div className="flex flex-col p-8 w-full gap-5">
          <DashboardHeader />
          <Toaster />
          <div>{children}</div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DashboardLayout;
