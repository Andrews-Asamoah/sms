"use client";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { FaChevronDown } from "react-icons/fa6";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const UserButton = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex h-11 items-center">
          <Avatar
            className="mr-5 h-8 w-8
          ">
            <AvatarImage src="/wis-logo.png" alt="image" />
            <AvatarFallback>AA</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm font-semibold text-left">
            <h1>Afia Konadu Zoey</h1>
            <h1 className="text-slate-500">Student</h1>
          </div>
          <div className="">
            <FaChevronDown size="12px" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Afia Konadu Zoey</p>
            <p className="text-xs leading-none text-muted-foreground">
              afiakonadu@gmail.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Log out
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserButton;
