"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Field, 
  FieldLabel, 
  FieldError,
  FieldGroup
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Home, Users, Trophy, Save } from "lucide-react";

const houseSchema = z.object({
  name: z.string().min(2),
  motto: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

type HouseFormValues = z.infer<typeof houseSchema>;

interface HouseDetailsProps {
  house: any;
  schoolSlug: string;
}

export function HouseDetails({ house, schoolSlug }: HouseDetailsProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<HouseFormValues>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      name: house.name,
      motto: house.motto || "",
      description: house.description || "",
      color: house.color || "#3b82f6",
    },
  });

  const selectedColor = watch("color");

  const onSubmit = async (values: HouseFormValues) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/schools/${schoolSlug}/houses/${house.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motto: values.motto,
          description: values.description,
          color: values.color,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update house details");
      }

      toast.success("House details updated successfully");
    } catch (error) {
      toast.error("Error updating house");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">House Name</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{house.name}</div>
            <p className="text-xs text-muted-foreground mt-1">Code: {house.code}</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{house._count?.students || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Assigned to this house</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">House Teacher</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">House Master</div>
            <p className="text-xs text-muted-foreground mt-1">Primary overseer</p>
          </CardContent>
        </Card>
      </div>

      <Card className="backdrop-blur-sm bg-card/50">
        <CardHeader>
          <CardTitle>Update House Information</CardTitle>
          <CardDescription>
            Modify the motto, description, and house color. Some fields are restricted to Admins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
              <div className="grid gap-6 md:grid-cols-2">
                <Field>
                  <FieldLabel>House Motto</FieldLabel>
                  <Input 
                    placeholder="Enter house motto..." 
                    {...register("motto")} 
                  />
                  <FieldError>{errors.motto?.message}</FieldError>
                </Field>

                <Field>
                  <FieldLabel>House Color</FieldLabel>
                  <div className="flex gap-3">
                    <Input 
                        type="color" 
                        className="p-1 h-10 w-20 cursor-pointer" 
                        value={selectedColor || "#3b82f6"}
                        onChange={(e) => setValue("color", e.target.value)}
                    />
                    <Input 
                        {...register("color")} 
                        placeholder="#000000" 
                    />
                  </div>
                  <FieldError>{errors.color?.message}</FieldError>
                </Field>
              </div>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea 
                  placeholder="Tell us about the house history or records..." 
                  className="min-h-[120px] resize-none"
                  {...register("description")} 
                />
                <FieldError>{errors.description?.message}</FieldError>
              </Field>
            </FieldGroup>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} size="lg" className="px-8 shadow-sm transition-all hover:scale-[1.02]">
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Save className="mr-2 h-5 w-5" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
