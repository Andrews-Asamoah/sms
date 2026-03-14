"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, Receipt, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { DashboardPageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const generateSchema = z.object({
  feeStructureId: z.string().min(1, "Please select a fee structure"),
  targetClasses: z.array(z.string()).min(1, "Please select at least one class"),
  billType: z.enum(["INVOICE", "PROFORMA"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof generateSchema>;

interface FeeStructure {
  id: string;
  name: string;
  description: string | null;
}

interface ClassItem {
  id: string;
  name: string;
  level: string;
}

interface GenerateInvoiceClientProps {
  schoolSlug: string;
  feeStructures: FeeStructure[];
  classes: ClassItem[];
}

export function GenerateInvoiceClient({
  schoolSlug,
  feeStructures,
  classes,
}: GenerateInvoiceClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationSummary, setGenerationSummary] = useState<{
    count: number;
    type: string;
  } | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      feeStructureId: "",
      targetClasses: [],
      billType: "INVOICE",
      notes: "",
    },
  });

  const feeStructureId = watch("feeStructureId");
  const targetClasses = watch("targetClasses");
  const billType = watch("billType");

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    onUpdate: ({ editor }) => {
      setValue("notes", editor.getHTML());
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/finance/invoices/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate bills");
      }

      const { createdBillsCount } = await res.json();
      
      setGenerationSummary({
        count: createdBillsCount,
        type: data.billType,
      });
      
      toast.success(`Successfully generated ${createdBillsCount} ${data.billType.toLowerCase()}s`);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAllClasses = (checked: boolean) => {
    if (checked) {
      setValue("targetClasses", classes.map((c) => c.id), { shouldValidate: true });
    } else {
      setValue("targetClasses", [], { shouldValidate: true });
    }
  };

  if (generationSummary) {
    return (
      <div className="flex-1 space-y-6 max-w-4xl mx-auto p-4 md:p-8 pt-6">
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Generation Complete!</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Successfully generated {generationSummary.count} {generationSummary.type.toLowerCase()}s for the selected classes.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push(`/${schoolSlug}/accountant/finance/invoices`)}>
              View Invoices
            </Button>
            <Button onClick={() => {
              setGenerationSummary(null);
              setValue("targetClasses", []);
              editor?.commands.clearContent();
            }}>
              Generate More
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 max-w-5xl mx-auto p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href={`/${schoolSlug}/accountant/finance/invoices`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <DashboardPageHeader
          title="Generate Batch Bills"
          description="Create invoices or proforma invoices for entire classes at once."
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Main Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Billing Details</CardTitle>
                <CardDescription>Select the fee structure template and type of bill to generate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <Field data-invalid={!!errors.billType}>
                  <FieldLabel>Bill Type</FieldLabel>
                  <RadioGroup
                    defaultValue={billType}
                    onValueChange={(val: "INVOICE" | "PROFORMA") => setValue("billType", val)}
                    className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                  >
                    <div className="flex items-center space-x-2 border rounded-md p-3 flex-1 bg-background/50 cursor-pointer hover:bg-accent transition-colors">
                      <RadioGroupItem value="INVOICE" id="r1" />
                      <div className="grid gap-1.5 cursor-pointer">
                        <FieldLabel htmlFor="r1" className="font-semibold text-base cursor-pointer">Official Invoice</FieldLabel>
                        <p className="text-xs text-muted-foreground">Creates a final bill and updates student balances.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3 flex-1 bg-background/50 cursor-pointer hover:bg-accent transition-colors">
                      <RadioGroupItem value="PROFORMA" id="r2" />
                      <div className="grid gap-1.5 cursor-pointer">
                        <FieldLabel htmlFor="r2" className="font-semibold text-base cursor-pointer">Proforma Invoice</FieldLabel>
                        <p className="text-xs text-muted-foreground">Creates an estimated bill without updating student balances.</p>
                      </div>
                    </div>
                  </RadioGroup>
                  <FieldError errors={[errors.billType]} />
                </Field>

                <Separator />

                <Field data-invalid={!!errors.feeStructureId}>
                  <FieldLabel>Select Fee Structure <span className="text-destructive">*</span></FieldLabel>
                  <Select
                    onValueChange={(val) => setValue("feeStructureId", val)}
                    defaultValue={feeStructureId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a tuition or fee template" />
                    </SelectTrigger>
                    <SelectContent>
                      {feeStructures.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                      {feeStructures.length === 0 && (
                        <SelectItem value="none" disabled>No fee structures available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    The total amount and line items will be copied from this template to each student's bill.
                  </p>
                  <FieldError errors={[errors.feeStructureId]} />
                </Field>

              </CardContent>
            </Card>

            {/* Notes / Message Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Additional Notes (Optional)</CardTitle>
                <CardDescription>Add customized payment instructions, deadlines, or remarks to appear on the bill.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="border rounded-md overflow-hidden bg-background">
                  <div className="bg-muted px-3 py-2 border-b flex gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      className={editor?.isActive('bold') ? 'bg-secondary' : ''}
                    >
                      Bold
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      className={editor?.isActive('italic') ? 'bg-secondary' : ''}
                    >
                      Italic
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      className={editor?.isActive('bulletList') ? 'bg-secondary' : ''}
                    >
                      Bullet List
                    </Button>
                  </div>
                  <EditorContent editor={editor} className="p-4 min-h-[150px] prose prose-sm max-w-none focus:outline-none" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-xl">Target Classes</CardTitle>
                <CardDescription>Select which classes should receive this bill.</CardDescription>
              </CardHeader>
              <CardContent>
                <Field data-invalid={!!errors.targetClasses}>
                  <div className="mb-4 flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="select-all" 
                          checked={classes.length > 0 && targetClasses.length === classes.length}
                           onCheckedChange={(checked) => handleSelectAllClasses(!!checked)}
                        />
                        <label htmlFor="select-all" className="text-sm font-medium leading-none cursor-pointer">
                          Select All
                        </label>
                     </div>
                     <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">
                       {targetClasses.length} Selected
                     </span>
                  </div>
                  <div className="border rounded-md">
                    <ScrollArea className="h-[300px] p-4">
                      <div className="space-y-4">
                        {classes.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No classes available
                          </p>
                        )}
                        {classes.map((cls) => (
                          <div
                            key={cls.id}
                            className="flex flex-row items-center space-x-3 space-y-0 p-2 hover:bg-muted/50 rounded-md transition-colors"
                          >
                            <Checkbox
                              id={`class-${cls.id}`}
                              checked={targetClasses?.includes(cls.id)}
                              onCheckedChange={(checked) => {
                                const newClasses = checked
                                  ? [...targetClasses, cls.id]
                                  : targetClasses.filter((id) => id !== cls.id);
                                setValue("targetClasses", newClasses, {
                                  shouldValidate: true,
                                });
                              }}
                            />
                            <FieldLabel
                              htmlFor={`class-${cls.id}`}
                              className="font-medium text-sm cursor-pointer flex-1"
                            >
                              {cls.name}
                            </FieldLabel>
                            <span className="text-xs text-muted-foreground">{cls.level}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <FieldError errors={[errors.targetClasses]} className="mt-2" />
                </Field>
                
                {billType === "PROFORMA" && (
                    <Alert className="mt-6 bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800">
                      <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertTitle className="text-blue-800 dark:text-blue-300">Proforma Notice</AlertTitle>
                      <AlertDescription className="text-blue-700/80 dark:text-blue-400/80 text-xs">
                        Proforma invoices are estimates. They won't affect student accounting balances until they are finalized.
                      </AlertDescription>
                    </Alert>
                )}
              </CardContent>
              <CardFooter className="pt-4 border-t bg-muted/20">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate {billType === "INVOICE" ? "Invoices" : "Proformas"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
