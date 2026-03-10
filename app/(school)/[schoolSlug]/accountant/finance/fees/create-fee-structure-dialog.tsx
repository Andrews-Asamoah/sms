"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const feeItemSchema = z.object({
  registryItemId: z.string().min(1, "Please select a standard fee item"),
  name: z.string().min(1, "Item name is required"),
  amount: z.number().min(0, "Amount must be positive"),
  isOptional: z.boolean(),
  description: z.string().optional(),
});

const feeStructureSchema = z.object({
  name: z.string().min(1, "Fee structure name is required"),
  description: z.string().optional(),
  classLevel: z.string().optional(),
  items: z.array(feeItemSchema).min(1, "At least one fee item is required"),
});

type FormValues = z.infer<typeof feeStructureSchema>;

interface CreateFeeStructureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateFeeStructureDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateFeeStructureDialogProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registryItems, setRegistryItems] = useState<any[]>([]);

  // Fetch standard fee items
  useEffect(() => {
    if (open && schoolSlug) {
      console.log(`🔍 [CreateFeeStructureDialog] Fetching fee items for ${schoolSlug}`);
      fetch(`/api/schools/${schoolSlug}/finance/fee-item-registry`)
        .then(res => res.json())
        .then(data => {
          console.log(`✅ [CreateFeeStructureDialog] Loaded ${data.length} fee items`);
          setRegistryItems(data);
        })
        .catch(err => console.error("❌ [CreateFeeStructureDialog] Fetch error:", err));
    }
  }, [open, schoolSlug]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: {
      name: "",
      description: "",
      classLevel: "",
      items: [{ registryItemId: "", name: "", amount: 0, isOptional: false, description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "items",
    control,
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/finance/fee-structures`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create fee structure");
      }

      toast.success("Fee structure created successfully");
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Fee Structure</DialogTitle>
          <DialogDescription>
            Define a new tuition or billing structure and its nested fee items.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Structure Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g. Grade 1 Tuition (Term 1)"
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.classLevel}>
                <FieldLabel htmlFor="classLevel">
                  Target Class Level (Optional)
                </FieldLabel>
                <Input
                  id="classLevel"
                  placeholder="e.g. Grade 1"
                  {...register("classLevel")}
                />
                <FieldError errors={[errors.classLevel]} />
              </Field>
            </div>

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="description">
                Description (Optional)
              </FieldLabel>
              <Textarea
                id="description"
                placeholder="Details about this fee structure"
                {...register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Fee Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      registryItemId: "",
                      name: "",
                      amount: 0,
                      isOptional: false,
                      description: "",
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border rounded-md bg-muted/20 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <Field data-invalid={!!errors.items?.[index]?.registryItemId}>
                        <FieldLabel htmlFor={`items.${index}.registryItemId`}>
                          Fee Item Category
                        </FieldLabel>
                        <Select
                          value={watch(`items.${index}.registryItemId`)}
                          onValueChange={(val) => {
                            setValue(`items.${index}.registryItemId`, val, { shouldValidate: true });
                            const matchingItem = registryItems.find(r => r.id === val);
                            if (matchingItem) {
                              setValue(`items.${index}.name`, matchingItem.name);
                            }
                          }}
                        >
                          <SelectTrigger id={`items.${index}.registryItemId`}>
                            <SelectValue placeholder="Select standard item" />
                          </SelectTrigger>
                          <SelectContent>
                            {registryItems.map(r => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[errors.items?.[index]?.registryItemId]} />
                      </Field>
                      <Field data-invalid={!!errors.items?.[index]?.amount}>
                        <FieldLabel htmlFor={`items.${index}.amount`}>
                          Amount (GHS)
                        </FieldLabel>
                        <Input
                          id={`items.${index}.amount`}
                          type="number"
                          step="any"
                          {...register(`items.${index}.amount` as const, {
                            valueAsNumber: true,
                          })}
                        />
                        <FieldError errors={[errors.items?.[index]?.amount]} />
                      </Field>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-8 text-destructive"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`items.${index}.isOptional`}
                      checked={watch(`items.${index}.isOptional`)}
                      onCheckedChange={(checked) =>
                        setValue(`items.${index}.isOptional`, checked)
                      }
                    />
                    <FieldLabel
                      htmlFor={`items.${index}.isOptional`}
                      className="!m-0 text-sm font-normal"
                    >
                      Optional Item
                    </FieldLabel>
                  </div>
                </div>
              ))}
              {errors.items?.root && (
                <p className="text-sm font-medium text-destructive">
                  {errors.items.root.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
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
                Save Fee Structure
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
