// ============================================
// REUSABLE PROFILE FORM COMPONENT
// components/forms/profile-form.tsx
// ============================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import {
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { updateUserProfile } from "@/app/actions/profile";
import type { UserProfileData } from "@/lib/types/profile";

const profileSchema = z.object({
  // Basic Info
  name: z.string().min(2, "Name must be at least 2 characters"),

  // Profile Info
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  otherNames: z.string().optional(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.date({
    error: "Date of birth is required",
  }),
  nationality: z.string().optional(),

  // Address
  residentialAddress: z.string().optional(),
  postalAddress: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),

  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyRelationship: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  userData: UserProfileData;
  revalidatePath?: string;
}

export function ProfileForm({ userData }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userData.name,
      firstName: userData.profile?.firstName || "",
      lastName: userData.profile?.lastName || "",
      otherNames: userData.profile?.otherNames || "",
      phone: userData.profile?.phone || "",
      alternatePhone: userData.profile?.alternatePhone || "",
      gender: userData.profile?.gender || "MALE",
      dateOfBirth: userData.profile?.dateOfBirth
        ? new Date(userData.profile.dateOfBirth)
        : undefined,
      nationality: userData.profile?.nationality || "Ghanaian",
      residentialAddress: userData.profile?.residentialAddress || "",
      postalAddress: userData.profile?.postalAddress || "",
      city: userData.profile?.city || "",
      region: userData.profile?.region || "",
      country: userData.profile?.country || "Ghana",
      emergencyContactName: userData.profile?.emergencyContactName || "",
      emergencyContactPhone: userData.profile?.emergencyContactPhone || "",
      emergencyRelationship: userData.profile?.emergencyRelationship || "",
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);

    try {
      const result = await updateUserProfile(data);

      if (result.success) {
        toast.success("Profile updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch {
      toast.error("An error occurred while updating your profile");
    } finally {
      setIsLoading(false);
    }
  }

  const initials = userData.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Profile Header Card */}
      <Card className="border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-white/20">
              <AvatarImage src={userData.image} alt={userData.name} />
              <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-600 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{userData.name}</CardTitle>
              <CardDescription className="text-base mt-1">
                {userData.email}
              </CardDescription>
              <div className="mt-2 inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400 border border-blue-500/20">
                {userData.role === "superAdmin"
                  ? "Super Administrator"
                  : userData.role}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Personal Information */}
      <Card className="border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal details and information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-name">Display Name</FieldLabel>
                <Input
                  {...field}
                  id="profile-name"
                  placeholder="Enter your display name"
                  aria-invalid={fieldState.invalid}
                  className="bg-white/5 border-white/10 focus:border-white/20"
                />
                <FieldDescription>
                  This is your public display name
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="firstName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-firstName">
                    First Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-firstName"
                    placeholder="Enter first name"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="lastName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-lastName">Last Name</FieldLabel>
                  <Input
                    {...field}
                    id="profile-lastName"
                    placeholder="Enter last name"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            name="otherNames"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-otherNames">
                  Other Names (Optional)
                </FieldLabel>
                <Input
                  {...field}
                  id="profile-otherNames"
                  placeholder="Enter other names"
                  aria-invalid={fieldState.invalid}
                  className="bg-white/5 border-white/10 focus:border-white/20"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <Controller
              name="gender"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-gender">Gender</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="profile-gender"
                      aria-invalid={fieldState.invalid}
                      className="bg-white/5 border-white/10 focus:border-white/20"
                    >
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="dateOfBirth"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-dateOfBirth">
                    Date of Birth
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="profile-dateOfBirth"
                        className={cn(
                          "pl-3 text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 w-full",
                          !field.value && "text-muted-foreground"
                        )}
                        aria-invalid={fieldState.invalid}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <Calendar className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="nationality"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-nationality">
                    Nationality
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-nationality"
                    placeholder="Enter nationality"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>Manage your contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-phone">Primary Phone</FieldLabel>
                  <Input
                    {...field}
                    id="profile-phone"
                    placeholder="+233 XX XXX XXXX"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="alternatePhone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-alternatePhone">
                    Alternate Phone
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-alternatePhone"
                    placeholder="+233 XX XXX XXXX"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <div className="rounded-lg bg-blue-500/10 p-4 border border-blue-500/20">
            <div className="flex gap-2">
              <Mail className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-400">
                  Email Address
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {userData.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact support to change your email address
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card className="border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Information
          </CardTitle>
          <CardDescription>
            Update your residential and postal address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            name="residentialAddress"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-residentialAddress">
                  Residential Address
                </FieldLabel>
                <Textarea
                  {...field}
                  id="profile-residentialAddress"
                  placeholder="Enter your residential address"
                  aria-invalid={fieldState.invalid}
                  className="bg-white/5 border-white/10 focus:border-white/20 resize-none"
                  rows={3}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="postalAddress"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-postalAddress">
                  Postal Address
                </FieldLabel>
                <Input
                  {...field}
                  id="profile-postalAddress"
                  placeholder="P.O. Box XXXX"
                  aria-invalid={fieldState.invalid}
                  className="bg-white/5 border-white/10 focus:border-white/20"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <Controller
              name="city"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-city">City</FieldLabel>
                  <Input
                    {...field}
                    id="profile-city"
                    placeholder="Enter city"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="region"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-region">Region</FieldLabel>
                  <Input
                    {...field}
                    id="profile-region"
                    placeholder="Enter region"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="country"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-country">Country</FieldLabel>
                  <Input
                    {...field}
                    id="profile-country"
                    placeholder="Enter country"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card className="border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Emergency Contact
          </CardTitle>
          <CardDescription>
            Provide emergency contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            name="emergencyContactName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-emergencyContactName">
                  Contact Name
                </FieldLabel>
                <Input
                  {...field}
                  id="profile-emergencyContactName"
                  placeholder="Enter emergency contact name"
                  aria-invalid={fieldState.invalid}
                  className="bg-white/5 border-white/10 focus:border-white/20"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="emergencyContactPhone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-emergencyContactPhone">
                    Contact Phone
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-emergencyContactPhone"
                    placeholder="+233 XX XXX XXXX"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="emergencyRelationship"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-emergencyRelationship">
                    Relationship
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-emergencyRelationship"
                    placeholder="e.g., Spouse, Parent, Sibling"
                    aria-invalid={fieldState.invalid}
                    className="bg-white/5 border-white/10 focus:border-white/20"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={isLoading}
          className="border-white/10 bg-white/5 hover:bg-white/10"
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
