"use client";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ChevronDown, User, LogOut, Loader2, Settings } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { toast } from "sonner";

const UserButton = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Logged out successfully");
            router.push("/login");
            router.refresh();
          },
          onError: (ctx) => {
            toast.error(ctx.error.message ?? "Failed to log out");
            setIsLoggingOut(false);
          },
        },
      });
    } catch (error) {
      toast.error("An error occurred during logout");
      setIsLoggingOut(false);
    }
  }, [router]);

  const handleProfileClick = useCallback(() => {
    router.push("/dashboard/profile");
  }, [router]);

  const handleSettingsClick = useCallback(() => {
    router.push("/dashboard/settings");
  }, [router]);

  // Show loading state
  if (isPending) {
    return (
      <Button 
        variant="outline" 
        className="h-11 px-3" 
        disabled
        aria-label="Loading user information"
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </Button>
    );
  }

  // If no session, return null
  if (!session?.user) {
    return null;
  }

  const user = session.user;
  
  // Generate initials from name
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(user.name);
  const displayRole = user.role; // You can get this from user.role if available

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-11 gap-2 px-2 hover:bg-accent transition-colors"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={user.image || "/wis-logo.png"} 
              alt={user.name || "User avatar"} 
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="hidden sm:flex flex-col items-start text-left min-w-0 max-w-[180px]">
            <span className="text-sm font-semibold leading-none truncate w-full">
              {user.name || "User"}
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-1 truncate w-full">
              {displayRole}
            </span>
          </div>
          
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        className="w-64" 
        align="end" 
        sideOffset={8}
        forceMount
      >
        <DropdownMenuLabel className="font-normal pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={user.image || "/wis-logo.png"} 
                alt={user.name || "User avatar"} 
              />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1 flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
              {user.role && (
                <p className="text-xs leading-none text-muted-foreground font-mono">
                  role: {user.role}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem 
            onClick={handleProfileClick}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleSettingsClick}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={handleLogout} 
          disabled={isLoggingOut}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserButton;