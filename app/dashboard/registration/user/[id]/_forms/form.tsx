"use client";

import * as z from "zod";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { RegisterUserSchema, UpdateUserSchema } from "@/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { register } from "@/actions/user";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { FormError } from "@/components/form-error";
import { FormSuccess } from "@/components/form-success";
import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/formHeader";
import { FaUserEdit, FaUserPlus } from "react-icons/fa";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Gender, User, UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import StudentForm from "./studentForm";

const UserForm = ({ initialData }: { initialData?: Partial<User> | null }) => {
  const [success, setSuccess] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, startTransition] = useTransition();

  const formResolver = initialData
    ? zodResolver(UpdateUserSchema)
    : zodResolver(RegisterUserSchema);

  const form = useForm<z.infer<typeof RegisterUserSchema>>({
    resolver: formResolver,
    defaultValues: initialData
      ? {
          email: initialData.email || "",
          firstName: initialData.firstName || "",
          lastName: initialData.lastName || "",
          otherNames: initialData.otherNames || "",
          location: initialData.location || "",
          password: initialData.password || "",
          phone: initialData.phone || "",
          image: initialData.image || "",
          role: initialData.role || UserRole.STUDENT,
        }
      : {
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          otherNames: "",
          phone: "",
          gender: "",
          location: "",
          image: "",
          username: "",
          fathersName: "",
          fathersPhone: "",
          mothersName: "",
          mothersPhone: "",
          gurdiansName: "",
          gurdiansPhone: "",
          role: UserRole.STUDENT,
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

  const router = useRouter();

  const onSubmit = (values: z.infer<typeof RegisterUserSchema>) => {
    setError("");
    setSuccess("");
    startTransition(() => {
      register(values).then((data) => {
        setError(data.error);
        setSuccess(data.success);
        if (data.success) {
          setTimeout(() => {
            router.push(`/dashboard/registration/user`);
            router.refresh();
          }, 2000);
        }
      });
    });
  };

  const onUpdate = (values: z.infer<typeof UpdateUserSchema>) => {
    setError("");
    setSuccess("");
    startTransition(() => {
      console.log(values);
      // updateUser(initialData?.id, values).then((data) => {
      //   setError(data.error);
      //   setSuccess(data.success);
      //   if (data.success) {
      //     router.push(`/workers`);
      //     router.refresh();
      //   }
      // });
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
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      disabled={isLoading}
                      defaultValue={
                        initialData ? initialData.role : UserRole.STUDENT
                      }
                      onValueChange={(value) => field.onChange(value)}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Role</SelectLabel>
                          {Object.values(UserRole).map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lastname</FormLabel>
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
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firstname</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otherNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Othername(s)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!initialData && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isLoading}
                          type="password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile No.</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      disabled={isLoading}
                      defaultValue={initialData ? initialData.gender : ""}
                      onValueChange={(value) => field.onChange(value)}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Gender</SelectLabel>
                          {Object.values(Gender).map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("role") === UserRole.STUDENT && (
                <div className="cols-span-1 md:col-span-2 lg:col-span-3">
                  <StudentForm form={form} isLoading={isLoading} />
                </div>
              )}
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

export default UserForm;
