// components/settings/sms-settings-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, MessageSquare } from "lucide-react";
import { updateSchoolSMSSettings } from "@/actions/school-data";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

const formSchema = z
  .object({
    useCustomSMS: z.boolean(),
    hubtelClientId: z.string().optional().nullable(),
    hubtelClientSecret: z.string().optional().nullable(),
    hubtelSenderId: z
      .string()
      .max(11, "Sender ID must be 11 characters or less")
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.useCustomSMS) {
      if (!data.hubtelClientId || data.hubtelClientId.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Client ID is required when custom gateway is enabled",
          path: ["hubtelClientId"],
        });
      }
      if (!data.hubtelClientSecret || data.hubtelClientSecret.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Client Secret is required when custom gateway is enabled",
          path: ["hubtelClientSecret"],
        });
      }
      if (!data.hubtelSenderId || data.hubtelSenderId.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sender ID is required when custom gateway is enabled",
          path: ["hubtelSenderId"],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface SMSSettingsFormProps {
  schoolId: string;
  initialSettings: {
    useCustomSMS?: boolean;
    hubtelClientId?: string | null;
    hubtelClientSecret?: string | null;
    hubtelSenderId?: string | null;
  };
}

export function SMSSettingsForm({ schoolId, initialSettings }: SMSSettingsFormProps) {
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      useCustomSMS: initialSettings?.useCustomSMS ?? false,
      hubtelClientId: initialSettings?.hubtelClientId ?? "",
      hubtelClientSecret: initialSettings?.hubtelClientSecret ?? "",
      hubtelSenderId: initialSettings?.hubtelSenderId ?? "",
    },
  });

  const watchUseCustomSMS = watch("useCustomSMS");

  async function onSubmit(values: FormValues) {
    setIsPending(true);
    try {
      const result = await updateSchoolSMSSettings(schoolId, {
        useCustomSMS: values.useCustomSMS,
        hubtelClientId: values.useCustomSMS ? values.hubtelClientId : null,
        hubtelClientSecret: values.useCustomSMS ? values.hubtelClientSecret : null,
        hubtelSenderId: values.useCustomSMS ? values.hubtelSenderId : null,
      });

      if (result.success) {
        toast.success("SMS Settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update SMS settings");
      }
    } catch (error) {
      toast.error("An error occurred while updating SMS settings");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup className="space-y-6">
        <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-0.5 max-w-[80%]">
            <label htmlFor="useCustomSMS" className="text-base font-semibold block cursor-pointer">
              Use Custom Hubtel Gateway
            </label>
            <span className="text-sm text-muted-foreground">
              Enable this if you want to route SMS messages using your own Hubtel developer credentials and custom Sender ID.
            </span>
          </div>
          <Switch
            id="useCustomSMS"
            checked={watchUseCustomSMS}
            onCheckedChange={(checked) => setValue("useCustomSMS", checked, { shouldValidate: true })}
          />
        </div>

        {!watchUseCustomSMS && (
          <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Using Platform SMS Gateway</h4>
              <p className="text-xs text-blue-700/80 dark:text-blue-400/80">
                By default, this school uses the platform's central SMS gateway. Outgoing SMS charges will be billed directly to your school's dashboard balance as per usage.
              </p>
            </div>
          </div>
        )}

        {watchUseCustomSMS && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid gap-6 md:grid-cols-2">
              <Field data-invalid={!!errors.hubtelClientId}>
                <FieldLabel htmlFor="hubtelClientId">Hubtel Client ID</FieldLabel>
                <Input
                  id="hubtelClientId"
                  placeholder="Enter Hubtel Client ID"
                  {...register("hubtelClientId")}
                />
                <FieldError errors={[errors.hubtelClientId]} />
              </Field>

              <Field data-invalid={!!errors.hubtelSenderId}>
                <FieldLabel htmlFor="hubtelSenderId">Sender ID</FieldLabel>
                <Input
                  id="hubtelSenderId"
                  placeholder="e.g. MySchool"
                  {...register("hubtelSenderId")}
                />
                <span className="text-xs text-muted-foreground block mt-1">
                  Must be approved on your Hubtel Developer Console. Max 11 characters.
                </span>
                <FieldError errors={[errors.hubtelSenderId]} />
              </Field>
            </div>

            <Field data-invalid={!!errors.hubtelClientSecret}>
              <FieldLabel htmlFor="hubtelClientSecret">Hubtel Client Secret</FieldLabel>
              <Input
                id="hubtelClientSecret"
                type="password"
                placeholder="Enter Hubtel Client Secret"
                {...register("hubtelClientSecret")}
              />
              <FieldError errors={[errors.hubtelClientSecret]} />
            </Field>
          </div>
        )}
      </FieldGroup>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="px-8 transition-all hover:scale-105 active:scale-95 icon-glow"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
