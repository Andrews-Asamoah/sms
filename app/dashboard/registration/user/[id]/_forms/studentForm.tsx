"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { UseFormReturn } from "react-hook-form";

interface StudentFormProps {
  form: UseFormReturn<any>;
  isLoading: boolean;
}
const StudentForm = ({ form, isLoading }: StudentFormProps) => (
  <div className="grid gap-2 md:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
     <Separator className="cols-span-1 md:col-span-2 lg:col-span-3" />
    <FormField
      control={form.control}
      name="fathersName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Father&apos;s name</FormLabel>
          <FormControl>
            <Input {...field} disabled={isLoading} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="fathersPhone"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Father&apos;s Contact</FormLabel>
          <FormControl>
            <Input {...field} disabled={isLoading} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="mothersName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Mother&apos;s name</FormLabel>
          <FormControl>
            <Input {...field} disabled={isLoading} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="mothersPhone"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Mother&apos;s Contact</FormLabel>
          <FormControl>
            <Input {...field} disabled={isLoading} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="gurdiansName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Gurdian&apos;s name</FormLabel>
          <FormControl>
            <Input {...field} disabled={isLoading} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="gurdiansPhone"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Gurdian&apos;s Contact</FormLabel>
          <FormControl>
            <Input {...field} disabled={isLoading} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

export default StudentForm;
