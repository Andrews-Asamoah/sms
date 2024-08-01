"use client";

import * as z from "zod";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { RegisterClassSchema, UpdateClassSchema } from "@/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { FormError } from "@/components/form-error";
import { FormSuccess } from "@/components/form-success";
import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/formHeader";
import { FaUserEdit, FaUserPlus } from "react-icons/fa";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Class } from "@prisma/client";
import { useRouter } from "next/navigation";
import { PiPresentation } from "react-icons/pi";
import { registerClass, updateClass } from "@/actions/registration";

const ClassForm = ({
  initialData,
}: {
  initialData?: Partial<Class> | null;
}) => {
  const [success, setSuccess] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, startTransition] = useTransition();

  const formResolver = initialData
    ? zodResolver(UpdateClassSchema)
    : zodResolver(RegisterClassSchema);

  const form = useForm<z.infer<typeof RegisterClassSchema>>({
    resolver: formResolver,
    defaultValues: initialData
      ? {
          name: initialData.name || "",
        }
      : {
          name: "",
        },
  });

  const Title = initialData ? "Edit Class Details" : "Add New Class";
  const Description = initialData
    ? "Edit a Class"
    : "Add a new class to your database";
  const Icon = initialData ? FaUserEdit : PiPresentation;
  const IconColor = initialData ? "text-blue-500" : "text-orange-500";
  const IconbgColor = initialData ? "bg-blue-500/10" : "bg-orange-500/10";
  const action = initialData ? "Save Changes" : "Register";

  const router = useRouter();

  const onSubmit = (values: z.infer<typeof RegisterClassSchema>) => {
    setError("");
    setSuccess("");
    startTransition(() => {
      registerClass(values).then((data) => {
        setError(data.error);
        setSuccess(data.success);
        if (data.success) {
          setTimeout(() => {
            router.push(`/dashboard/registration/class`);
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
      updateClass(initialData?.id, values).then((data) => {
        setError(data.error);
        setSuccess(data.success);
        if (data.success) {
          setTimeout(() => {
            router.push(`/dashboard/registration/class`);
            router.refresh();
          }, 2000);
        }
      });
      console.log(values);
    });
  };

  return (
    <Card>
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
            <div className="grid gap-2 md:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isLoading}
                        required={initialData == null}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

export default ClassForm;
