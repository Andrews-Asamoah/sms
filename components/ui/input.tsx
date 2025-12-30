import * as React from "react";

import { IoEye, IoEyeOff } from "react-icons/io5";

import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const toggleVisibility = () => setIsVisible(!isVisible);
    const inputType = isVisible ? "text" : type;

    const showPasswordToggle = type === "password";
    const hasStartIcon = !!startIcon;
    const hasEndIcon = !!endIcon || showPasswordToggle;

    return (
      <div
        className={cn(
          "flex items-center relative h-9 w-full rounded-md",
          "border border-input bg-transparent px-3 py-1 text-sm",
          "shadow-sm transition-colors file:border-0 file:bg-transparent",
          "file:text-sm file:font-medium placeholder:text-muted-foreground",
          "focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          props.disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {hasStartIcon && (
          <span className="flex items-center absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 justify-center mr-2 text-slate-400">
            {startIcon}
          </span>
        )}

        <input
          type={inputType}
          className={cn(
            "flex w-full bg-transparent focus:outline-none",
            "disabled:cursor-not-allowed",
            className
          )}
          ref={ref}
          {...props}
        />

        {hasEndIcon && (
          <span className="flex items-center justify-center">
            {showPasswordToggle ? (
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                type="button"
                onClick={toggleVisibility}
                aria-label={isVisible ? "Hide password" : "Show password"}
              >
                {isVisible ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            ) : (
              <span className="text-slate-400">{endIcon}</span>
            )}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
