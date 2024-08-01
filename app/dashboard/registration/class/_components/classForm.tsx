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
import { startTransition, useState, useTransition } from "react";
import { Class } from "@prisma/client";
import { RegisterClassSchema, UpdateClassSchema } from "@/schemas";
import { FaUserEdit, FaUserPlus } from "react-icons/fa";

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
          classTeacher: initialData.classTeacher || "",
        }
      : {
          name: "",
          classTeacher: "",
        },
  });

  const Title = initialData ? "Edit User Details" : "Add New User";
  const Description = initialData
    ? "Edit a User"
    : "Add a new user to your database";
  const Icon = initialData ? FaUserEdit : FaUserPlus;
  const IconColor = initialData ? "text-blue-500" : "text-orange-500";
  const IconbgColor = initialData ? "bg-blue-500/10" : "bg-orange-500/10";
  const action = initialData ? "Save Changes" : "Register";

  const onSubmit = (values: z.infer<typeof RegisterClassSchema>) => {};

  const onUpdate = (values: z.infer<typeof UpdateClassSchema>) => {
    setError("");
    setSuccess("");
    startTransition(() => {
      console.log(values);
    });
  };

  return (
    <div className="">
      <h1>Create New Class</h1>
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
                  <FormLabel>Class name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="classTeacher"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Teacher</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ClassForm;
