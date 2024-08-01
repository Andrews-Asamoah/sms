"use client";

import * as z from "zod";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { FormError } from "@/components/form-error";
import { FormSuccess } from "@/components/form-success";
import { useEffect, useState, useTransition } from "react";
import { AcademicYear } from "@prisma/client";
import { CreateAcademicYearSchema, UpdateClassSchema } from "@/schemas";
import { FaUserEdit, FaUserPlus } from "react-icons/fa";
import { DateRangePicker } from "@/components/dateRange-picker";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { registerAcademicYear } from "@/actions/registration";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormHeader } from "@/components/ui/formHeader";

const AcademicYearForm = ({
  initialData,
}: {
  initialData?: Partial<AcademicYear> | null;
}) => {
  const [success, setSuccess] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, startTransition] = useTransition();
  const [date, setDate] = useState<DateRange | undefined>();

  const formResolver = initialData
    ? zodResolver(UpdateClassSchema)
    : zodResolver(CreateAcademicYearSchema);

  const form = useForm<z.infer<typeof CreateAcademicYearSchema>>({
    resolver: formResolver,
    defaultValues: initialData
      ? {
          name: initialData.name || "",
          date: {
            startDate: initialData.startDate || undefined,
            endDate: initialData.endDate || undefined,
          },
        }
      : {
          name: "",
          date: undefined,
        },
  });

  useEffect(() => {
    form.setValue(
      "date",
      date ? { startDate: date.from, endDate: date.to } : undefined
    );
  }, [date, form]);

  const Title = initialData
    ? "Edit an Academic Year"
    : "Create New Academic Year";
  const Description = initialData
    ? "Edit a Academic Year"
    : "Add a new Academic Year to your database";
  const Icon = initialData ? FaUserEdit : FaUserPlus;
  const IconColor = initialData ? "text-blue-500" : "text-orange-500";
  const IconbgColor = initialData ? "bg-blue-500/10" : "bg-orange-500/10";
  const action = initialData ? "Save Changes" : "Submit";

  const router = useRouter();

  const onSubmit = (values: z.infer<typeof CreateAcademicYearSchema>) => {
    setError("");
    setSuccess("");
    startTransition(() => {
      registerAcademicYear(values).then((data) => {
        setError(data.error);
        setSuccess(data.success);
        if (data.success) {
          setTimeout(() => {
            router.push(`/dashboard/registration/academicYear`);
            router.refresh();
          }, 2000);
        }
      });
    });
  };

  const onUpdate = (values: z.infer<typeof UpdateClassSchema>) => {
    setError("");
    setSuccess("");
    startTransition(() => {
      // updateClass(initialData?.id, values).then((data) => {
      //   setError(data.error);
      //   setSuccess(data.success);
      //   if (data.success) {
      //     setTimeout(() => {
      //       router.push(`/dashboard/registration/class`);
      //       router.refresh();
      //     }, 2000);
      //   }
      // });
      console.log(values);
    });
  };

  return (
    <Card className="">
      <CardHeader>
        <FormHeader
          title={Title}
          description={Description}
          icon={Icon}
          iconColor={IconColor}
          iconbgColor={IconbgColor}
        />
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(initialData ? onUpdate : onSubmit)}
            className="space-y-6">
            <div className="">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isLoading}
                        placeholder="2024/2025"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-10">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start to End Date</FormLabel>
                      <FormControl>
                        <DateRangePicker
                          value={date}
                          onChange={setDate}
                          modal={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormError message={error} />
            <FormSuccess message={success} />
            <Button disabled={isLoading} type="submit" className="w-full flex">
              {action}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AcademicYearForm;
