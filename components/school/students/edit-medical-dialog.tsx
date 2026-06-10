"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const medicalFormSchema = z.object({
  bloodGroup: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  medicalConditions: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyRelationship: z.string().optional().nullable(),
});

type MedicalFormValues = z.infer<typeof medicalFormSchema>;

interface EditMedicalDialogProps {
  studentId: string;
  studentName: string;
  schoolSlug: string;
  initialData?: {
    bloodGroup?: string | null;
    allergies?: string | null;
    medicalConditions?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyRelationship?: string | null;
  };
  trigger?: React.ReactNode;
}

export function EditMedicalDialog({
  studentId,
  studentName,
  schoolSlug,
  initialData,
  trigger,
}: EditMedicalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MedicalFormValues>({
    resolver: zodResolver(medicalFormSchema),
    defaultValues: {
      bloodGroup: initialData?.bloodGroup || "",
      allergies: initialData?.allergies || "",
      medicalConditions: initialData?.medicalConditions || "",
      emergencyContactName: initialData?.emergencyContactName || "",
      emergencyContactPhone: initialData?.emergencyContactPhone || "",
      emergencyRelationship: initialData?.emergencyRelationship || "",
    },
  });

  const bloodGroupValue = watch("bloodGroup") || "";

  const onSubmit = async (data: MedicalFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/students/${studentId}/medical`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update medical record");
      }

      toast.success("Medical record updated successfully", {
        description: `Medical details for ${studentName} have been saved.`,
      });
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error("[Edit Medical Dialog] Error:", error);
      toast.error("Failed to update medical record", {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            Update Medical Record
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500 fill-rose-500 animate-pulse" />
              Medical & Emergency Details
            </DialogTitle>
            <DialogDescription>
              Update medical conditions, allergies, and emergency contact details for{" "}
              <span className="font-semibold text-foreground">{studentName}</span>.
            </DialogDescription>
          </DialogHeader>

          <Separator />

          {/* Medical Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">
              Health Information
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldGroup>
                <FieldLabel htmlFor="bloodGroup">Blood Group</FieldLabel>
                <Select
                  value={bloodGroupValue}
                  onValueChange={(value) => setValue("bloodGroup", value)}
                >
                  <SelectTrigger id="bloodGroup" className="w-full">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None / Not Specified</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>

            <FieldGroup>
              <FieldLabel htmlFor="allergies">Allergies</FieldLabel>
              <Textarea
                id="allergies"
                placeholder="List any food, drug, or environmental allergies (leave blank if none)"
                rows={2}
                {...register("allergies")}
              />
              {errors.allergies && (
                <FieldError>{errors.allergies.message}</FieldError>
              )}
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="medicalConditions">Medical Conditions</FieldLabel>
              <Textarea
                id="medicalConditions"
                placeholder="List any chronic illnesses, conditions, or regular medications (leave blank if none)"
                rows={2}
                {...register("medicalConditions")}
              />
              {errors.medicalConditions && (
                <FieldError>{errors.medicalConditions.message}</FieldError>
              )}
            </FieldGroup>
          </div>

          <Separator />

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">
              Emergency Contact
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldGroup className="md:col-span-2">
                <FieldLabel htmlFor="emergencyContactName">Contact Name</FieldLabel>
                <Input
                  id="emergencyContactName"
                  placeholder="Full name of emergency contact"
                  {...register("emergencyContactName")}
                />
                {errors.emergencyContactName && (
                  <FieldError>{errors.emergencyContactName.message}</FieldError>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="emergencyContactPhone">Contact Phone</FieldLabel>
                <Input
                  id="emergencyContactPhone"
                  placeholder="+233 24 123 4567"
                  {...register("emergencyContactPhone")}
                />
                {errors.emergencyContactPhone && (
                  <FieldError>{errors.emergencyContactPhone.message}</FieldError>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="emergencyRelationship">Relationship</FieldLabel>
                <Input
                  id="emergencyRelationship"
                  placeholder="e.g. Mother, Father, Aunt"
                  {...register("emergencyRelationship")}
                />
                {errors.emergencyRelationship && (
                  <FieldError>{errors.emergencyRelationship.message}</FieldError>
                )}
              </FieldGroup>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-rose-600 hover:bg-rose-700 text-white">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
