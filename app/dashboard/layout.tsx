import SideNavBar from "@/components/sideNavBar";
import { TooltipProvider } from "@/components/ui/tooltip";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <TooltipProvider>
      <div className="w-full h-full flex">
        {/* Sidebar*/}
        <SideNavBar />
        {/* main page */}
        <div className=" p-8 w-full">{children}</div>
      </div>
    </TooltipProvider>
  );
};

export default DashboardLayout;
