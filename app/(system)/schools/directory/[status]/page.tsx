// app/(system)/schools/directory/[status]/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Plus,
  School,
  Users,
  GraduationCap,
  Building2,
  Eye,
  Settings,
  ExternalLink,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "Schools Directory | SuperAdmin Dashboard",
  description: "Manage schools filtered by status",
};

export const dynamic = "force-dynamic";

interface DirectoryPageProps {
  params: Promise<{
    status: string;
  }>;
}

export default async function DirectoryPage({ params }: DirectoryPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const isSuperAdmin = session.isSuperAdmin;

  if (!isSuperAdmin) {
    redirect("/unauthorized");
  }

  const { status } = await params;

  // Map directory status to DB conditions
  let statusCondition = {};
  let pageTitle = "Schools";
  let emptyMessage = "No schools found in this directory.";

  if (status === "active") {
    statusCondition = {
      subscription: { status: { in: ["ACTIVE", "TRIALING"] } },
    };
    pageTitle = "Active Schools";
    emptyMessage = "No active schools found.";
  } else if (status === "suspended") {
    statusCondition = {
      subscription: { status: { in: ["PAST_DUE", "CANCELED", "UNPAID"] } },
    };
    pageTitle = "Suspended Schools";
    emptyMessage = "No suspended schools found.";
  } else if (status === "archived" || status === "archive") {
    // Assuming archived means no active subscription or specific db flag
    // Currently, let's look for explicitly canceled or incomplete
    statusCondition = {
      subscription: { status: { in: ["CANCELED", "INCOMPLETE_EXPIRED"] } },
    };
    pageTitle = "Archived Schools";
    emptyMessage = "No archived schools found.";
  } else {
    // Fallback if status doesn't match
    redirect("/schools");
  }

  // Get filtered schools
  const schools = await prisma.school.findMany({
    where: statusCondition,
    include: {
      subscription: true,
      organization: {
        include: {
          members: {
            where: {
              userId: session.user.id,
            },
            take: 1,
          },
        },
      },
      _count: {
        select: {
          students: true,
          teachers: true,
          staff: true,
          classes: true,
          departments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground mt-2">
            Viewing all schools with {status} status.
          </p>
        </div>
        {status === "active" && (
          <Button asChild size="lg" className="shadow-lg">
            <Link href="/schools/new">
              <Plus className="mr-2 h-4 w-4" />
              Create School
            </Link>
          </Button>
        )}
      </div>

      {/* Empty State */}
      {schools.length === 0 ? (
        <Card className="backdrop-blur-xl bg-background/60 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <School className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No schools found</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              {emptyMessage}
            </p>
            {status !== "active" && (
              <Button asChild size="lg" className="shadow-lg">
                <Link href="/schools">View All Schools</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="grid" className="space-y-6">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <TabsList className="backdrop-blur-xl bg-background/60">
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
            </TabsList>
          </div>

          {/* Grid View */}
          <TabsContent value="grid" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {schools.map((school) => {
                const isActive =
                  school.subscription?.status === "ACTIVE" ||
                  school.subscription?.status === "TRIALING";
                const isPremium =
                  school.subscription?.planType === "PREMIUM" ||
                  school.subscription?.planType === "ENTERPRISE";

                return (
                  <Card
                    key={school.id}
                    className="backdrop-blur-xl bg-background/60 border-primary/10 hover:border-primary/30 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group flex flex-col h-full"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0 ring-2 ring-primary/5 group-hover:ring-primary/20 transition-all">
                          <AvatarImage
                            src={school.logo ? `${school.logo}?t=${new Date(school.updatedAt).getTime()}` : undefined}
                            alt={school.name}
                          />
                          <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                            {school.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <CardTitle className="text-base leading-tight mb-1 line-clamp-2">
                            {school.name}
                          </CardTitle>
                          <CardDescription className="font-mono text-xs truncate">
                            {school.code}
                          </CardDescription>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className="text-xs px-2 py-0.5"
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                        {isPremium && (
                          <Badge
                            variant="outline"
                            className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs px-2 py-0.5"
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                        {school.subscription?.isOnTrial && (
                          <Badge
                            variant="outline"
                            className="border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5"
                          >
                            Trial
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 flex-1 flex flex-col pt-0">
                      {/* Statistics */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-primary/5 transition-colors">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="h-4 w-4 shrink-0" />
                            <span>Students</span>
                          </div>
                          <span className="font-semibold tabular-nums">
                            {school._count.students}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-primary/5 transition-colors">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4 shrink-0" />
                            <span>Teachers</span>
                          </div>
                          <span className="font-semibold tabular-nums">
                            {school._count.teachers}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-primary/5 transition-colors">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span>Classes</span>
                          </div>
                          <span className="font-semibold tabular-nums">
                            {school._count.classes}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-primary/10 mt-auto">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-0 hover:bg-primary/10 hover:border-primary/30"
                        >
                          <Link href={`/schools/${school.subdomain}`}>
                            <Eye className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                            <span className="truncate">View</span>
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="shrink-0 hover:bg-primary/10 hover:border-primary/30"
                        >
                          <Link href={`/schools/${school.subdomain}/settings`}>
                            <Settings className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="shrink-0 hover:bg-primary/10 hover:border-primary/30"
                        >
                          <Link
                            href={`/${school.subdomain}/admin`}
                            target="_blank"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Table View */}
          <TabsContent value="table">
            <Card className="backdrop-blur-xl bg-background/60 border-primary/10">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-primary/10">
                      <TableHead>School</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Students</TableHead>
                      <TableHead className="text-right">Teachers</TableHead>
                      <TableHead className="text-right">Classes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => {
                      const isActive =
                        school.subscription?.status === "ACTIVE" ||
                        school.subscription?.status === "TRIALING";
                      const isPremium =
                        school.subscription?.planType === "PREMIUM" ||
                        school.subscription?.planType === "ENTERPRISE";

                      return (
                        <TableRow
                          key={school.id}
                          className="group hover:bg-primary/5 border-primary/10"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/5 group-hover:ring-primary/20 transition-all">
                                <AvatarImage
                                  src={school.logo ? `${school.logo}?t=${new Date(school.updatedAt).getTime()}` : undefined}
                                  alt={school.name}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {school.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {school.name}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono truncate">
                                  {school.subdomain}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {school.code}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Badge
                                variant={isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {isActive ? "Active" : "Inactive"}
                              </Badge>
                              {isPremium && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                                >
                                  Premium
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {school._count.students}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {school._count.teachers}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {school._count.classes}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                              >
                                <Link
                                  href={`/schools/${school.subdomain}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="hover:bg-primary/10"
                              >
                                <Link
                                  href={`/schools/${school.subdomain}/settings`}
                                >
                                  <Settings className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="hover:bg-primary/10"
                              >
                                <Link
                                  href={`/${school.subdomain}/admin`}
                                  target="_blank"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
