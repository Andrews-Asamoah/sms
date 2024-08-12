"use client";
import { useEffect, useState } from "react";
import { Nav } from "./nav";
import { Button } from "./ui/button";
import Logo from "./logo";
import { useWindowSize } from "@react-hook/window-size";

import { AiOutlineDashboard } from "react-icons/ai";
import {
  FaBookReader,
  FaChalkboardTeacher,
  FaRegCalendarAlt,
  FaRegCalendarCheck,
  FaUserGraduate,
} from "react-icons/fa";
import {
  FaChevronLeft,
  FaChevronRight,
  FaMoneyBillTrendUp,
  FaMoneyBills,
} from "react-icons/fa6";
import { LuFileCheck2 } from "react-icons/lu";
import { IoFingerPrint } from "react-icons/io5";
import { PiPresentation } from "react-icons/pi";
import { GrUserSettings } from "react-icons/gr";
import { BsDatabaseFillAdd } from "react-icons/bs";
import { Card } from "./ui/card";

type Props = {};

export default function SideNavBar({}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileWidth, setMobileWidth] = useState(false);
  const [width] = useWindowSize();

  useEffect(() => {
    setMobileWidth(width < 768);
  }, [width]);

  function toggleSidebar() {
    setIsCollapsed(!isCollapsed);
  }

  return (
    <Card className="relative min-h-full max-w-[260px] w-auto  px-3 py-3 pb-10">
      {!mobileWidth && (
        <div className="absolute right-[-14px] top-7">
          <Button
            onClick={toggleSidebar}
            className="rounded-full p-2"
            variant="secondary">
            {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </Button>
        </div>
      )}
      <Logo
        isCollapsed={mobileWidth ? true : isCollapsed}
        links={[
          {
            title: "WIS Student Portal",
            triggerTxt: "Logo",
            href: "/",
            variant: "default",
          },
        ]}
      />
      <Nav
        isCollapsed={mobileWidth ? true : isCollapsed}
        links={[
          {
            title: "Dashboard",
            href: "/dashboard",
            icon: AiOutlineDashboard,
            variant: "default",
          },
          {
            title: "Registration",
            href: "/dashboard/registration",
            label: "",
            icon: BsDatabaseFillAdd,
            variant: "ghost",
            submenu: true,
            submenuItems: [
              {
                title: "Academic Year",
                href: "/dashboard/registration/academicYear",
              },
              { title: "Users", href: "/dashboard/registration/user" },
              { title: "Class", href: "/dashboard/registration/class" },
              { title: "Subject", href: "/dashboard/registration/subject" },
            ],
          },
          {
            title: "Students",
            href: "/dashboard/students",
            label: "",
            icon: FaUserGraduate,
            variant: "ghost",
          },
          {
            title: "Teachers",
            href: "/dashboard/teachers",
            label: "",
            icon: FaChalkboardTeacher,
            variant: "ghost",
          },
          {
            title: "Accounts",
            href: "/dashboard/accounts",
            label: "",
            icon: FaMoneyBillTrendUp,
            variant: "ghost",
          },
          {
            title: "Examination",
            href: "/dashboard/examination",
            label: "",
            icon: FaBookReader,
            variant: "ghost",
          },
          {
            title: "Check Results",
            href: "/dashboard/results",
            label: "",
            icon: LuFileCheck2,
            variant: "ghost",
          },
          {
            title: "Bill and Payments",
            href: "/dashboard/bills",
            label: "",
            icon: FaMoneyBills,
            variant: "ghost",
          },
          {
            title: "Status Checker",
            href: "/dashboard/student_status",
            label: "",
            icon: IoFingerPrint,
            variant: "ghost",
          },
          {
            title: "Attendance",
            href: "/dashboard/attendance",
            label: "",
            icon: FaRegCalendarCheck,
            variant: "ghost",
          },
          {
            title: "Notice",
            href: "/dashboard/notice",
            label: "",
            icon: PiPresentation,
            variant: "ghost",
          },
          {
            title: "Academic Calendar",
            href: "/dashboard/calender",
            label: "",
            icon: FaRegCalendarAlt,
            variant: "ghost",
          },
          {
            title: "System Settings",
            href: "/dashboard/settings",
            label: "",
            icon: GrUserSettings,
            variant: "ghost",
          },
        ]}
      />
    </Card>
  );
}
