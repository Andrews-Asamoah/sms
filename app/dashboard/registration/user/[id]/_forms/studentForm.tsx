"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Class } from "@prisma/client";
import { UseFormReturn } from "react-hook-form";

interface StudentFormProps {
  form: UseFormReturn<any>;
  isLoading: boolean;
  classes: Class[];
  // initialData?: {
  //   classId?: string | null;
  //   fathersName?: string;
  //   fathersPhone?: string;
  //   mothersName?: string;
  //   mothersPhone?: string;
  //   guardiansName?: string;
  //   guardiansPhone?: string;
  // };
}
const StudentForm = ({
  form,
  isLoading,
  classes,
}: // initialData,
StudentFormProps) => (
  <div className="grid gap-2 md:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    <Separator className="cols-span-1 md:col-span-2 lg:col-span-3" />
    <FormField
      control={form.control}
      name="classId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Class</FormLabel>
          <Select
            disabled={isLoading}
            // defaultValue={field.value}
            onValueChange={(value) => field.onChange(value)}
            value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Class</SelectLabel>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
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
