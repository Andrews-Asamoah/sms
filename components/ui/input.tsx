import * as React from "react";

import { IoEye, IoEyeOff } from "react-icons/io5";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const toggleVisibility = () => setIsVisible(!isVisible);
    const inputType = isVisible ? "text" : type;

    return (
      <div
        className="flex relative h-9 w-full rounded-md 
      border border-input bg-transparent px-3 py-1 text-sm
      shadow-sm transition-colors file:border-0 file:bg-transparent
      file:text-sm file:font-medium placeholder:text-muted-foreground
      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
        <input
          type={inputType}
          className={cn("flex w-full focus:outline-none", className)}
          ref={ref}
          {...props}
        />
        {type === "password" && (
          <button
            className="focus:outline-none"
            type="button"
            onClick={toggleVisibility}>
            {isVisible ? (
              <IoEyeOff className="text-xl ml-2 text-zinc-400 pointer-events-none" />
            ) : (
              <IoEye className="text-xl ml-2 text-zinc-400 pointer-events-none" />
            )}
          </button>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
