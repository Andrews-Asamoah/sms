"use client";

import { useState } from "react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const feeItemSchema = z.object({
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

  const form = useForm<FormValues>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: {
      name: "",
      description: "",
      classLevel: "",
      items: [{ name: "", amount: 0, isOptional: false, description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "items",
    control: form.control,
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
      form.reset();
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Structure Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Grade 1 Tuition (Term 1)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Class Level (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Grade 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Details about this fee structure"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Fee Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
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
                      <FormField
                        control={form.control}
                        name={`items.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Development Fee"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (GHS)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                  <div className="flex items-center gap-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.isOptional`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!m-0 text-sm font-normal">
                            Optional Item
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              {form.formState.errors.items?.root && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.items.root.message}
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
