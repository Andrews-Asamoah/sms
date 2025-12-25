import * as React from "react";

import { IoEye, IoEyeOff } from "react-icons/io5";

import { cn } from "@/lib/utils";

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
          <span className="flex items-center justify-center mr-2 text-muted-foreground">
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
          <span className="flex items-center justify-center ml-2">
            {showPasswordToggle ? (
              <button
                className="focus:outline-none text-muted-foreground hover:text-foreground transition-colors"
                type="button"
                onClick={toggleVisibility}
                aria-label={isVisible ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {isVisible ? (
                  <IoEyeOff className="text-xl" />
                ) : (
                  <IoEye className="text-xl" />
                )}
              </button>
            ) : (
              <span className="text-muted-foreground">{endIcon}</span>
            )}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
