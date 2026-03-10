"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Search,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Switch } from "@/components/ui/switch";

const clubSettingsSchema = z.object({
  name: z.string().min(2, "Club name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  teacherInChargeId: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type ClubSettingsValues = z.infer<typeof clubSettingsSchema>;

interface UserImage {
  image: string | null;
}

interface CommonProfile {
  firstName: string;
  lastName: string;
  user: UserImage;
}

interface ClubMember {
  id: string;
  role: string | null;
  student: {
    id: string;
    profile: CommonProfile | null;
  };
}

interface Teacher {
  id: string;
  profile: CommonProfile | null;
}

interface Club {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  teacherInChargeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  teacherInCharge: Teacher | null;
  members: ClubMember[];
}

interface Student {
  id: string;
  profile: CommonProfile | null;
}

interface ClubDetailsClientProps {
  club: Club;
  allStudents: Student[];
  teachers: Teacher[];
  schoolSlug: string;
}

export function ClubDetailsClient({
  club,
  allStudents,
  teachers,
  schoolSlug,
}: ClubDetailsClientProps) {
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClubSettingsValues>({
    resolver: zodResolver(clubSettingsSchema),
    defaultValues: {
      name: club.name,
      description: club.description || "",
      teacherInChargeId: club.teacherInCharge?.id || "",
      isActive: club.isActive,
    },
  });

  const settingsTeacherId = watch("teacherInChargeId");
  const settingsIsActive = watch("isActive");

  // Filter out students who are already members
  const memberIds = new Set(club.members.map((m) => m.student.id));
  const availableStudents = allStudents.filter((s) => !memberIds.has(s.id));

  const filteredMembers = club.members.filter((m) =>
    `${m.student.profile?.firstName || ""} ${m.student.profile?.lastName || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const filteredAvailable = availableStudents.filter((s) =>
    `${s.profile?.firstName || ""} ${s.profile?.lastName || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  async function handleAddMembers() {
    if (selectedStudents.length === 0) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/clubs/${club.id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds: selectedStudents }),
        },
      );

      if (!response.ok) throw new Error("Failed to add members");

      toast.success(`Successfully added ${selectedStudents.length} members`);
      setIsAdding(false);
      setSelectedStudents([]);
      router.refresh();
    } catch (error) {
      toast.error("Error adding members");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/clubs/${club.id}/members/${memberId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to remove member");

      toast.success("Member removed");
      router.refresh();
    } catch (error) {
      toast.error("Error removing member");
    }
  }

  const onUpdateSettings: SubmitHandler<ClubSettingsValues> = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/schools/${schoolSlug}/clubs/${club.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update club settings");

      toast.success("Club settings updated successfully");
      router.refresh();
    } catch (error) {
      toast.error("Error updating club settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="members" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="members" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Members
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Add Club Members</DialogTitle>
                <DialogDescription>
                  Select students to add to {club.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-3">
                  {filteredAvailable.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.profile?.user.image || ""} />
                          <AvatarFallback>
                            {student.profile?.firstName?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {student.profile?.firstName || ""} {student.profile?.lastName || ""}
                        </span>
                      </div>
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                    </div>
                  ))}
                  {filteredAvailable.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No more available students found.
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={selectedStudents.length === 0 || isLoading}
                  onClick={handleAddMembers}
                >
                  {isLoading
                    ? "Adding..."
                    : `Add ${selectedStudents.length} Students`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={member.student.profile?.user.image || ""}
                            />
                            <AvatarFallback>
                              {member.student.profile?.firstName?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {member.student.profile?.firstName || ""}{" "}
                            {member.student.profile?.lastName || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {member.role || "Member"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Club Settings</CardTitle>
            <CardDescription>
              Update club information and coordinators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onUpdateSettings)} className="space-y-6">
              <FieldGroup>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="club-name">Club Name</FieldLabel>
                  <Input 
                    id="club-name" 
                    {...register("name")} 
                  />
                  <FieldError errors={[errors.name]} />
                </Field>
                
                <Field data-invalid={!!errors.description}>
                  <FieldLabel htmlFor="club-desc">Description</FieldLabel>
                  <Input 
                    id="club-desc" 
                    {...register("description")} 
                  />
                  <FieldError errors={[errors.description]} />
                </Field>

                <Field data-invalid={!!errors.teacherInChargeId}>
                  <FieldLabel htmlFor="teacher-select">Teacher in Charge</FieldLabel>
                  <Select
                    onValueChange={(val) => setValue("teacherInChargeId", val)}
                    value={settingsTeacherId || undefined}
                  >
                    <SelectTrigger id="teacher-select">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.profile?.firstName || ""} {teacher.profile?.lastName || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.teacherInChargeId]} />
                </Field>

                <Field orientation="horizontal" className="justify-between items-center rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FieldLabel>Status</FieldLabel>
                    <FieldDescription>
                      Toggle whether the club is active or inactive.
                    </FieldDescription>
                  </div>
                  <Switch
                    checked={settingsIsActive}
                    onCheckedChange={(val) => setValue("isActive", val)}
                  />
                </Field>
              </FieldGroup>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
