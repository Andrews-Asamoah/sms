"use client";

import { useState } from "react";
import { Plus, Search, Users, Trash2, Edit, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

const clubSchema = z.object({
  name: z.string().min(2, "Club name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  teacherInChargeId: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type ClubFormValues = z.infer<typeof clubSchema>;

interface Club {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  teacherInChargeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  teacherInCharge: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      user: {
        image: string | null;
      };
    } | null;
  } | null;
  _count: {
    members: number;
  };
}

interface Teacher {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
    user: {
      image: string | null;
    };
  } | null;
}

interface ClubsClientProps {
  clubs: Club[];
  teachers: Teacher[];
  schoolId: string;
  schoolSlug: string;
}

export function ClubsClient({
  clubs,
  teachers,
  schoolSlug,
}: ClubsClientProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [deletingClub, setDeletingClub] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClubFormValues>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: "",
      description: "",
      teacherInChargeId: "",
      isActive: true,
    },
  });

  const teacherInChargeId = watch("teacherInChargeId");
  const isActive = watch("isActive");

  const filteredClubs = clubs.filter((club) =>
    club.name.toLowerCase().includes(search.toLowerCase()),
  );

  const onSubmit: SubmitHandler<ClubFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const url = editingClub 
        ? `/api/schools/${schoolSlug}/clubs/${editingClub.id}`
        : `/api/schools/${schoolSlug}/clubs`;
      
      const response = await fetch(url, {
        method: editingClub ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to save club");

      toast.success(editingClub ? "Club updated successfully" : "Club created successfully");
      setIsOpen(false);
      setEditingClub(null);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(editingClub ? "Error updating club" : "Error creating club");
    } finally {
      setIsLoading(false);
    }
  };

  const onEdit = (club: Club) => {
    setEditingClub(club);
    reset({
      name: club.name,
      description: club.description || "",
      teacherInChargeId: club.teacherInCharge?.id || "",
      isActive: club.isActive,
    });
    setIsOpen(true);
  };

  const onDelete = async () => {
    if (!deletingClub) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/schools/${schoolSlug}/clubs/${deletingClub}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete club");

      toast.success("Club deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error("Error deleting club");
    } finally {
      setIsLoading(false);
      setDeletingClub(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clubs..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button onClick={() => {
          setEditingClub(null);
          reset({
            name: "",
            description: "",
            teacherInChargeId: "",
            isActive: true,
          });
          setIsOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Club
        </Button>

        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setEditingClub(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClub ? "Edit Club" : "Create New Club"}</DialogTitle>
              <DialogDescription>
                {editingClub ? "Update club details." : "Add a new club or society to the school."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="club-name">Club Name</FieldLabel>
                  <Input 
                    id="club-name"
                    placeholder="e.g. Science Club" 
                    {...register("name")} 
                  />
                  <FieldError errors={[errors.name]} />
                </Field>

                <Field data-invalid={!!errors.description}>
                  <FieldLabel htmlFor="club-description">Description (Optional)</FieldLabel>
                  <Input
                    id="club-description"
                    placeholder="Brief description of the club"
                    {...register("description")}
                  />
                  <FieldError errors={[errors.description]} />
                </Field>

                <Field data-invalid={!!errors.teacherInChargeId}>
                  <FieldLabel htmlFor="teacher-select">Teacher in Charge</FieldLabel>
                  <Select
                    onValueChange={(val) => setValue("teacherInChargeId", val)}
                    value={teacherInChargeId || undefined}
                  >
                    <SelectTrigger id="teacher-select">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.profile?.firstName}{" "}
                          {teacher.profile?.lastName}
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
                    checked={isActive}
                    onCheckedChange={(val) => setValue("isActive", val)}
                  />
                </Field>
              </FieldGroup>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingClub ? "Update Club" : "Create Club"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingClub} onOpenChange={(open) => !open && setDeletingClub(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the club and remove all members. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club Name</TableHead>
                <TableHead>Teacher in Charge</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClubs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No clubs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell className="font-medium">
                      <Link 
                        href={`/${schoolSlug}/admin/clubs/${club.id}`}
                        className="hover:underline text-primary"
                      >
                        {club.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {club.teacherInCharge ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage
                              src={club.teacherInCharge.profile?.user.image || ""}
                            />
                            <AvatarFallback className="text-[10px]">
                              {club.teacherInCharge.profile?.firstName[0]}
                              {club.teacherInCharge.profile?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {club.teacherInCharge.profile?.firstName}{" "}
                            {club.teacherInCharge.profile?.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Not assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{club._count.members}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={club.isActive ? "secondary" : "outline"}>
                        {club.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          asChild
                        >
                          <Link href={`/${schoolSlug}/admin/clubs/${club.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => onEdit(club)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeletingClub(club.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
