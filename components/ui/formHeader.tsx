"use client";
import { BsPlus } from "react-icons/bs";
import { Button } from "./button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { IconType } from "react-icons/lib";

type ClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;

interface HeadingProps {
  title: string;
  description: string;
  iconColor?: string;
  iconbgColor?: string;
  onAddNewClick?: ClickHandler;
  icon: IconType;
}

export const FormHeader = ({
  title,
  description,
  iconColor,
  onAddNewClick,
  iconbgColor,
  icon: Icon,
}: HeadingProps) => {
  return (
    <>
      <div className="flex items-center mb-4 gap-x-3 w-full justify-between">
        <div className="flex gap-2">
          <div className={cn("p-2 w-fit rounded-md", iconbgColor)}>
            <Icon className={cn("w-10 h-10", iconColor)} />
          </div>
          <div className="">
            <h2 className="text-3xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {onAddNewClick && (
          <div className="">
            <Button onClick={onAddNewClick}>
              <BsPlus className="mr-2" size={15} />
              Add New
            </Button>
          </div>
        )}
      </div>
      <Separator className="mb-8" />
    </>
  );
};
