import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GradeReviewActions } from "./GradeReviewActions";

interface ReviewPageProps {
  params: Promise<{ 
    schoolSlug: string;
    templateId: string;
    classId: string;
  }>;
}

export default async function GradeReviewPage({ params }: ReviewPageProps) {
  const { schoolSlug, templateId, classId } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  
  if (activeRole?.effectiveRole !== "admin" && activeRole?.effectiveRole !== "owner" && !session.isSuperAdmin) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const [template, cls, scores] = await Promise.all([
    prisma.assessmentTemplate.findUnique({
      where: { id: templateId },
      include: { components: { orderBy: { displayOrder: "asc" } } }
    }),
    prisma.class.findUnique({
      where: { id: classId },
      include: { students: { where: { status: "ACTIVE" }, orderBy: { profile: { lastName: "asc" } }, include: { profile: true } } }
    }),
    prisma.assessmentScore.findMany({
      where: { templateId, student: { classId } },
      include: { componentScores: true }
    })
  ]);

  if (!template || !cls) notFound();

  const scoreMap = new Map(scores.map(s => [s.studentId, s]));
  const hasSubmitted = scores.some(s => s.status === "SUBMITTED");

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/${schoolSlug}/admin/academics/grading/monitoring`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{template.name} - Review</h1>
            <p className="text-muted-foreground">{cls.name}</p>
          </div>
        </div>
        <GradeReviewActions 
          schoolSlug={schoolSlug} 
          templateId={templateId} 
          classId={classId} 
          hasSubmitted={hasSubmitted}
        />
      </div>

      <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              {template.components.map(comp => (
                <TableHead key={comp.id} className="text-center font-mono text-xs">
                  {comp.name}<br/>
                  <span className="text-muted-foreground">({Number(comp.maxMarks)})</span>
                </TableHead>
              ))}
              <TableHead className="text-center font-bold">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cls.students.map(student => {
              const score = scoreMap.get(student.id);
              const fullName = `${student.profile.firstName} ${student.profile.lastName}`;

              return (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{fullName}</TableCell>
                  {template.components.map(comp => {
                    const compScore = score?.componentScores.find(cs => cs.componentId === comp.id);
                    return (
                      <TableCell key={comp.id} className="text-center font-mono">
                        {compScore ? Number(compScore.marksObtained) : "-"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold">
                    {score ? Number(score.totalScore) : "-"}
                  </TableCell>
                  <TableCell>
                    {score ? (
                      <Badge variant={score.status === "FINAL" ? "default" : score.status === "SUBMITTED" ? "secondary" : "outline"}>
                        {score.status}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-dashed">NOT STARTED</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
