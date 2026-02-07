// components/school/houses/house-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const houseSchema = z.object({
  name: z.string().min(2, "House name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "House code must be at least 2 characters")
    .max(10, "House code must be at most 10 characters"),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  motto: z.string().optional().nullable(),
  houseTeacherId: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type HouseFormValues = z.infer<typeof houseSchema>;

interface HouseDialogProps {
  children?: React.ReactNode;
  schoolId: string;
  schoolSlug: string;
  teachers: Array<{
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  }>;
  house?: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    color: string | null;
    motto: string | null;
    houseTeacherId: string | null;
    isActive: boolean;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PREDEFINED_COLORS = [
  { name: "Red", value: "#EF4444" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F97316" },
  { name: "Teal", value: "#14B8A6" },
];

export function HouseDialog({
  children,
  schoolId,
  schoolSlug,
  teachers,
  house,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: HouseDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<HouseFormValues>({
    resolver: zodResolver(houseSchema),
    defaultValues: house
      ? {
          name: house.name,
          code: house.code,
          description: house.description,
          color: house.color,
          motto: house.motto,
          houseTeacherId: house.houseTeacherId,
          isActive: house.isActive,
        }
      : {
          name: "",
          code: "",
          description: null,
          color: "#3B82F6",
          motto: null,
          houseTeacherId: null,
          isActive: true,
        },
  });

  // Reset form when dialog opens with house data
  useEffect(() => {
    if (open && house) {
      reset({
        name: house.name,
        code: house.code,
        description: house.description,
        color: house.color,
        motto: house.motto,
        houseTeacherId: house.houseTeacherId,
        isActive: house.isActive,
      });
    }
  }, [open, house, reset]);

  const isActive = watch("isActive");
  const selectedColor = watch("color");
  const houseTeacherId = watch("houseTeacherId");

  async function onSubmit(data: HouseFormValues) {
    setIsSubmitting(true);

    try {
      const url = house
        ? `/api/schools/${schoolSlug}/houses/${house.id}`
        : `/api/schools/${schoolSlug}/houses`;

      const method = house ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, schoolId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save house");
      }

      toast.success(
        house ? "House updated successfully" : "House created successfully",
        {
          description: `${data.name} has been ${house ? "updated" : "created"}.`,
        },
      );

      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      console.error("Error saving house:", error);
      toast.error("Failed to save house", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-shrink-0">
        <DialogTitle>{house ? "Edit House" : "Create New House"}</DialogTitle>
        <DialogDescription>
          {house
            ? "Update house information and settings."
            : "Add a new house to your school. Fill in the details below."}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col overflow-hidden flex-1"
      >
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup>
              <FieldLabel htmlFor="name">House Name *</FieldLabel>
              <Input
                id="name"
                placeholder="e.g., Phoenix House"
                {...register("name")}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="code">House Code *</FieldLabel>
              <Input
                id="code"
                placeholder="e.g., PHX"
                maxLength={10}
                {...register("code")}
              />
              {errors.code && <FieldError>{errors.code.message}</FieldError>}
            </FieldGroup>
          </div>

          <FieldGroup>
            <FieldLabel htmlFor="motto">House Motto</FieldLabel>
            <Input
              id="motto"
              placeholder="e.g., Rise from the ashes"
              {...register("motto")}
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              placeholder="Brief description of the house..."
              rows={3}
              {...register("description")}
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="color">House Color</FieldLabel>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {PREDEFINED_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setValue("color", color.value)}
                    className={`h-10 w-10 rounded-full border-2 transition-all ${
                      selectedColor === color.value
                        ? "border-primary scale-110 shadow-md"
                        : "border-gray-300 hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
              <Input
                id="color"
                type="color"
                className="h-10 w-full"
                {...register("color")}
              />
            </div>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="houseTeacherId">House Teacher</FieldLabel>
            <Select
              value={houseTeacherId || "none"}
              onValueChange={(value) =>
                setValue("houseTeacherId", value === "none" ? null : value)
              }
            >
              <SelectTrigger id="houseTeacherId">
                <SelectValue placeholder="Select a teacher (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No teacher assigned</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.profile.firstName} {teacher.profile.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          <div className="flex items-center space-x-2 pb-4">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="isActive">Active House</Label>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {house ? "Update House" : "Create House"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  // If children provided (for trigger button), render with trigger
  if (children) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  // Otherwise render as controlled dialog without trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogContent}
    </Dialog>
  );
}
