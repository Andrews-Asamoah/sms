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
  PenLine,
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
import { ProfileImageEditor } from "@/components/settings/profile-image-editor";
import { SignatureEditor } from "@/components/settings/signature-editor";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { updateUserProfile } from "@/app/actions/profile";
import type { UserProfileData } from "@/lib/types/profile";
import {
  ShieldCheck,
  MapPinned,
  Contact,
  Globe,
  Settings2,
} from "lucide-react";

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
  const [displayName, setDisplayName] = useState(userData.name);
  const showSignatureTab = ["superadmin", "owner", "admin", "teacher", "headteacher"].includes(
    userData.role.toLowerCase(),
  );

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

        // Derive composite name for instant UI feedback
        const nameParts = [
          data.firstName,
          data.otherNames,
          data.lastName,
        ].filter(Boolean);
        const compositeName =
          nameParts.length > 0 ? nameParts.join(" ") : data.name;

        setDisplayName(compositeName);
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
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-black/5 dark:border-white/10 bg-linear-to-br from-slate-100 via-white to-blue-100/30 dark:from-slate-900 dark:via-slate-900 dark:to-blue-900/20 shadow-2xl p-8 md:p-12 transition-colors duration-300">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="relative shrink-0 transition-transform duration-500 hover:scale-105">
            <div className="absolute inset-0 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 blur-xl opacity-20 animate-pulse" />
            <ProfileImageEditor
              currentImage={userData.image}
              userName={userData.name}
            />
          </div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-linear-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-white/90 dark:to-slate-400 bg-clip-text text-transparent drop-shadow-sm dark:drop-shadow-2xl">
                {displayName}
              </h1>
              <p className="text-xl text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2">
                <Mail className="h-4 w-4" />
                {userData.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div className="group flex items-center gap-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-5 py-2 backdrop-blur-md transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:border-blue-500/30">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {userData.role === "superAdmin"
                    ? "SYSTEM ARCHITECT"
                    : userData.role.toUpperCase()}
                </span>
              </div>

              {userData.profile?.nationality && (
                <div className="flex items-center gap-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-5 py-2 backdrop-blur-md">
                  <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {userData.profile.nationality}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="personal" className="w-full space-y-8">
          <div className="flex justify-center w-full">
            <TabsList className="h-14 p-1.5 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl overflow-x-auto no-scrollbar transition-colors">
              <TabsTrigger
                value="personal"
                className="gap-2 px-6 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Personal</span>
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="gap-2 px-6 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
              >
                <Contact className="h-4 w-4" />
                <span className="hidden sm:inline">Contact</span>
              </TabsTrigger>
              <TabsTrigger
                value="address"
                className="gap-2 px-6 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
              >
                <MapPinned className="h-4 w-4" />
                <span className="hidden sm:inline">Address</span>
              </TabsTrigger>
              <TabsTrigger
                value="emergency"
                className="gap-2 px-6 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
              >
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Emergency</span>
              </TabsTrigger>
              {showSignatureTab && (
                <TabsTrigger
                  value="signature"
                  className="gap-2 px-6 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  <PenLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Signature</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Personal Info Tab */}
            <TabsContent value="personal" className="mt-0">
              <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl shadow-2xl rounded-3xl overflow-hidden transition-colors">
                <CardHeader className="border-b border-black/5 dark:border-white/5 p-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                      <Settings2 className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold">
                        Identity & Profile
                      </CardTitle>
                      <CardDescription>
                        Configure your core identity and display preferences
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                          Display Name
                        </FieldLabel>
                        <Input
                          {...field}
                          placeholder="Your unique handle"
                          className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-blue-500/30 transition-all rounded-xl"
                        />
                        <FieldDescription>
                          How you appear across the school system
                        </FieldDescription>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div className="grid gap-8 md:grid-cols-2">
                    <Controller
                      name="firstName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            First Name
                          </FieldLabel>
                          <Input
                            {...field}
                            disabled={userData.role === "student"}
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-blue-500/30 transition-all rounded-xl disabled:bg-slate-100 dark:disabled:bg-slate-950 disabled:text-slate-500"
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
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            Last Name
                          </FieldLabel>
                          <Input
                            {...field}
                            disabled={userData.role === "student"}
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-blue-500/30 transition-all rounded-xl disabled:bg-slate-100 dark:disabled:bg-slate-950 disabled:text-slate-500"
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
                        <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-400">
                          Other Names
                        </FieldLabel>
                        <Input
                          {...field}
                          placeholder="Middle or native names"
                          className="h-12 bg-white/5 border-white/10 focus:ring-2 focus:ring-blue-500/30 transition-all rounded-xl"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div className="grid gap-8 md:grid-cols-3">
                    <Controller
                      name="gender"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            Gender Identity
                          </FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 rounded-xl disabled:opacity-50"
                              disabled={userData.role === "student"}
                            >
                              <SelectValue placeholder="Identity" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-black/10 dark:border-white/10 rounded-xl">
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
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-400">
                            Date of Birth
                          </FieldLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                disabled={userData.role === "student"}
                                className={cn(
                                  "h-12 justify-start bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 rounded-xl hover:bg-black/10 dark:hover:bg-white/10",
                                  !field.value && "text-slate-500",
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, "PPP")
                                  : "Pick date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 rounded-2xl border-white/10 overflow-hidden"
                              align="start"
                            >
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                captionLayout="dropdown"
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                // className="bg-slate-900 text-white"
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
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-400">
                            Nationality
                          </FieldLabel>
                          <Input
                            {...field}
                            className="h-12 bg-white/5 border-white/10 focus:ring-2 focus:ring-blue-500/30 transition-all rounded-xl"
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
            </TabsContent>

            {/* Contact Info Tab */}
            <TabsContent value="contact" className="mt-0">
              <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl shadow-2xl rounded-3xl overflow-hidden transition-colors">
                <CardHeader className="border-b border-black/5 dark:border-white/5 p-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                      <Phone className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold">
                        Communication
                      </CardTitle>
                      <CardDescription>
                        Manage how we reach you for important updates
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid gap-8 md:grid-cols-2">
                    <Controller
                      name="phone"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            Primary Mobile
                          </FieldLabel>
                          <Input
                            {...field}
                            placeholder="+233 XX XXX XXXX"
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-purple-500/30 transition-all rounded-xl"
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
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            Alternate Line
                          </FieldLabel>
                          <Input
                            {...field}
                            placeholder="+233 XX XXX XXXX"
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-purple-500/30 transition-all rounded-xl"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  <div className="group relative p-6 rounded-2xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:border-blue-500/20 overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
                      <Mail className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="relative flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Permanent Email
                        </h4>
                        <p className="text-xl font-medium text-slate-900 dark:text-white mt-1">
                          {userData.email}
                        </p>
                        <p className="text-xs text-slate-500 mt-2 font-medium bg-slate-400/10 inline-block px-2 py-1 rounded-md">
                          SECURITY PROTECTED — CONTACT IT DEPARTMENT TO MODIFY
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="mt-0">
              <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl shadow-2xl rounded-3xl overflow-hidden transition-colors">
                <CardHeader className="border-b border-black/5 dark:border-white/5 p-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold">
                        Location & Residency
                      </CardTitle>
                      <CardDescription>
                        Your physical presence information
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <Controller
                    name="residentialAddress"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                          Physical Home Address
                        </FieldLabel>
                        <Textarea
                          {...field}
                          rows={3}
                          className="bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-amber-500/30 transition-all rounded-2xl resize-none"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div className="grid gap-8 md:grid-cols-2">
                    <Controller
                      name="postalAddress"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            Postal/Digital Address
                          </FieldLabel>
                          <Input
                            {...field}
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-amber-500/30 transition-all rounded-xl"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Controller
                      name="city"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            City
                          </FieldLabel>
                          <Input
                            {...field}
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-amber-500/30 transition-all rounded-xl"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  <div className="grid gap-8 md:grid-cols-2">
                    <Controller
                      name="region"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            Region/State
                          </FieldLabel>
                          <Input
                            {...field}
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-amber-500/30 transition-all rounded-xl"
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
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            Country
                          </FieldLabel>
                          <Input
                            {...field}
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-amber-500/30 transition-all rounded-xl"
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
            </TabsContent>

            {/* Emergency Contact Tab */}
            <TabsContent value="emergency" className="mt-0">
              <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl shadow-2xl rounded-3xl overflow-hidden transition-colors">
                <CardHeader className="border-b border-black/5 dark:border-white/5 p-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold">
                        Safeguarding
                      </CardTitle>
                      <CardDescription>
                        Primary emergency response information
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <Controller
                    name="emergencyContactName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                          Full Name
                        </FieldLabel>
                        <Input
                          {...field}
                          className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-rose-500/30 transition-all rounded-xl"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div className="grid gap-8 md:grid-cols-2">
                    <Controller
                      name="emergencyContactPhone"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            Direct Phone
                          </FieldLabel>
                          <Input
                            {...field}
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-rose-500/30 transition-all rounded-xl"
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
                          <FieldLabel className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            Relationship
                          </FieldLabel>
                          <Input
                            {...field}
                            placeholder="e.g. Next of Kin"
                            className="h-12 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-rose-500/30 transition-all rounded-xl"
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
            </TabsContent>

            {showSignatureTab && (
              <TabsContent value="signature" className="mt-0">
                <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl shadow-2xl rounded-3xl overflow-hidden transition-colors">
                  <CardHeader className="border-b border-black/5 dark:border-white/5 p-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                        <PenLine className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold tracking-tight">
                          Digital Signature
                        </CardTitle>
                        <CardDescription>
                          Manage your digital signature used on official school documents
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <SignatureEditor currentSignatureUrl={userData.profile?.signatureUrl} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </div>
        </Tabs>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-lg">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-4 flex gap-4 items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isLoading}
              className="px-6 h-12 rounded-xl bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 font-bold"
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/20 font-black text-lg transition-all active:scale-95"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  SYNCING...
                </div>
              ) : (
                "SAVE CHANGES"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
