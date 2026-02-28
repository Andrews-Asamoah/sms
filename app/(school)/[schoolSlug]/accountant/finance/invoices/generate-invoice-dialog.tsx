"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

const generateSchema = z.object({
  feeStructureId: z.string().min(1, "Please select a fee structure"),
  targetClasses: z.array(z.string()).min(1, "Please select at least one class"),
});

type FormValues = z.infer<typeof generateSchema>;

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GenerateInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
}: GenerateInvoiceDialogProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [structures, setStructures] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  const {
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      feeStructureId: "",
      targetClasses: [],
    },
  });

  const feeStructureId = watch("feeStructureId");
  const targetClasses = watch("targetClasses");

  useEffect(() => {
    if (!open) return;
    const loadData = async () => {
      try {
        const [feeRes, classRes] = await Promise.all([
          fetch(`/api/schools/${schoolSlug}/finance/fee-structures`),
          fetch(`/api/schools/${schoolSlug}/classes`),
        ]);
        if (feeRes.ok) setStructures(await feeRes.json());
        if (classRes.ok) setClasses(await classRes.json());
      } catch (e) {
        console.error("Failed to load dialog options", e);
      }
    };
    loadData();
  }, [open, schoolSlug]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/finance/invoices/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate invoices");
      }

      const { createdBillsCount } = await res.json();
      toast.success(`Successfully generated ${createdBillsCount} invoices`);
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Batch Invoices</DialogTitle>
          <DialogDescription>
            Assign a fee structure template to active students in targeted
            classes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup>
            <Field data-invalid={!!errors.feeStructureId}>
              <FieldLabel>Select Fee Structure</FieldLabel>
              <Select
                onValueChange={(val) => setValue("feeStructureId", val)}
                defaultValue={feeStructureId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tuition template" />
                </SelectTrigger>
                <SelectContent>
                  {structures.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.feeStructureId]} />
            </Field>

            <Field data-invalid={!!errors.targetClasses}>
              <FieldLabel>Target Classes</FieldLabel>
              <div className="border rounded-md p-4">
                <ScrollArea className="h-48">
                  <div className="space-y-4">
                    {classes.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Loading classes...
                      </p>
                    )}
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex flex-row items-center space-x-3 space-y-0"
                      >
                        <Checkbox
                          id={`class-${cls.id}`}
                          checked={targetClasses?.includes(cls.id)}
                          onCheckedChange={(checked) => {
                            const newClasses = checked
                              ? [...targetClasses, cls.id]
                              : targetClasses.filter(
                                  (id: string) => id !== cls.id,
                                );
                            setValue("targetClasses", newClasses, {
                              shouldValidate: true,
                            });
                          }}
                        />
                        <FieldLabel
                          htmlFor={`class-${cls.id}`}
                          className="font-normal text-sm cursor-pointer hover:text-primary"
                        >
                          {cls.name}
                        </FieldLabel>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <FieldError errors={[errors.targetClasses]} />
            </Field>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate Invoices
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
