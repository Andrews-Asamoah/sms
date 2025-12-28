"use client";

import { Menu, Bell, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

import { useState } from "react";
import SideNavBar from "./sideNavBar";
import { Badge } from "./ui/badge";
import UserButton from "./auth/user-button";

const DashboardHeader = () => {
  const [notificationCount] = useState(3);

  return (
    <header className="flex items-center justify-between w-full">
      {/* Left Section - Mobile Menu & Search */}
      <div className="flex items-center gap-4 flex-1">
    
    
        {/* Search Bar - Hidden on mobile */}
        <div className="hidden lg:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Input
              startIcon={<Search className="h-4 w-4 text-muted-foreground" />}
              type="search"
              placeholder="Search..."
              className="pl-10 pr-4 h-10"
            />
          </div>
        </div>
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search Icon for Mobile */}
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notificationCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Button */}
        <UserButton />
      </div>
    </header>
  );
};

export default DashboardHeader;