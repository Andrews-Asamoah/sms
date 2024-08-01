import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { FaChevronDown } from "react-icons/fa6";
import { Button } from "./ui/button";

const DashboardHeader = () => {
  return (
    <Card className="flex items-center justify-end py-2 px-3">
      <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 rounded-xl px-[5px] py-[3px]">
        <Avatar>
          <AvatarImage src="/wis-logo.png" />
          <AvatarFallback>AA</AvatarFallback>
        </Avatar>
        <div className="flex flex-col text-sm font-semibold">
          <h1>Afia Konadu Zoey</h1>
          <h1 className="text-slate-500">Student</h1>
        </div>
        <div className="">
          <FaChevronDown size="12px" />
        </div>
      </div>
    </Card>
  );
};

export default DashboardHeader;
