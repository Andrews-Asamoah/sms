"use client";

import { useState } from "react";
import { format } from "date-fns";
import { BookOpen, FileText, Trophy, Activity, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface AssessmentScoreProps {
  id: string;
  totalScore: number;
  percentage: number;
  grade: string | null;
  remarks: string | null;
  subject: {
    name: string;
    code: string;
  };
  term: {
    name: string;
  };
}

export interface ReportCardProps {
  id: string;
  publishedAt: Date | null;
  set: {
    term: {
      name: string;
    };
    academicYear: {
      name: string;
    }
  };
  data: any;
}

interface StudentGradesViewProps {
  schoolSlug: string;
  studentName: string;
  assessmentScores: AssessmentScoreProps[];
  reportCards: ReportCardProps[];
}

export function StudentGradesView({
  schoolSlug,
  studentName,
  assessmentScores,
  reportCards,
}: StudentGradesViewProps) {
  // Group assessments by term
  const groupedAssessments = assessmentScores.reduce<Record<string, AssessmentScoreProps[]>>((acc, score) => {
    const termName = score.term.name;
    if (!acc[termName]) acc[termName] = [];
    acc[termName].push(score);
    return acc;
  }, {});

  const termNames = Object.keys(groupedAssessments);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Academic Performance</h1>
        <p className="text-muted-foreground">View grades and report cards for {studentName}</p>
      </div>

      <Tabs defaultValue="assessments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Assessments
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Report Cards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="space-y-4">
          {termNames.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg">No assessments recorded</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1">
                  Your assessment scores will appear here once they are published by teachers.
                </p>
              </CardContent>
            </Card>
          ) : (
            termNames.map((term) => (
              <Card key={term} className="shadow-sm">
                <CardHeader className="bg-primary/[0.02]">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {term}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">Percentage</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedAssessments[term].map((score) => (
                          <TableRow key={score.id} className="hover:bg-muted/10">
                            <TableCell className="font-medium">
                              <div>{score.subject.name}</div>
                              <div className="text-xs text-muted-foreground">{score.subject.code}</div>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-primary">
                              {Number(score.totalScore).toString()}
                            </TableCell>
                            <TableCell className="text-center">
                              {Number(score.percentage).toString()}%
                            </TableCell>
                            <TableCell className="text-center">
                              {score.grade ? (
                                <Badge variant="outline" className="font-bold shadow-sm">
                                  {score.grade}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={score.remarks || ""}>
                              {score.remarks || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {reportCards.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg">No report cards available</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1">
                  End of term report cards will be published here upon completion of the academic term.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reportCards.map((report) => (
                <Card key={report.id} className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <CardHeader className="pb-3 border-b bg-primary/[0.02]">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{report.set.term.name}</span>
                      <Trophy className="h-4 w-4 text-amber-500" />
                    </CardTitle>
                    <CardDescription>{report.set.academicYear.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Published: {report.publishedAt ? format(new Date(report.publishedAt), "MMM dd, yyyy") : "Unknown"}
                    </div>
                    <Badge variant="secondary">View Full Report</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
