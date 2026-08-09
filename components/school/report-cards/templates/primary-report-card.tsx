"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

const DEFAULT_GRADE_SCALES = [
  { grade: "1", description: "Excellent", minScore: 80, maxScore: 100 },
  { grade: "2", description: "Very Good", minScore: 70, maxScore: 79 },
  { grade: "3", description: "Good", minScore: 60, maxScore: 69 },
  { grade: "4", description: "Credit", minScore: 50, maxScore: 59 },
  { grade: "5–6", description: "Pass", minScore: 40, maxScore: 49 },
  { grade: "7–9", description: "Below Average", minScore: 0, maxScore: 39 },
];

function lookupGrade(score: number, scales: any[]) {
  const sorted = [...scales].sort((a, b) => b.minScore - a.minScore);
  for (const s of sorted) {
    if (score >= s.minScore && score <= s.maxScore) {
      return { grade: s.grade, description: s.description };
    }
  }
  return { grade: "—", description: "—" };
}

const SAMPLE_SUBJECTS = [
  { subjectName: "Mathematics", classWorkScore: 25, examScore: 60, totalScore: 85, grade: "1", position: "2nd" },
  { subjectName: "English Language", classWorkScore: 23, examScore: 55, totalScore: 78, grade: "2", position: "3rd" },
  { subjectName: "Science", classWorkScore: 27, examScore: 63, totalScore: 90, grade: "1", position: "1st" },
  { subjectName: "Social Studies", classWorkScore: 24, examScore: 58, totalScore: 82, grade: "2", position: "2nd" },
  { subjectName: "Religious & Moral Ed.", classWorkScore: 22, examScore: 52, totalScore: 74, grade: "3", position: "4th" },
];

export function PrimaryReportCard({
  student,
  termName,
  academicYear,
  selConfig,
  remarks,
  report,
  gradingSystem,
}: any) {
  const reportData = report?.data || {};
  const subjects: any[] =
    (reportData?.subjects && reportData.subjects.length > 0)
      ? reportData.subjects
      : SAMPLE_SUBJECTS;

  const scales = gradingSystem?.gradeScales?.length
    ? gradingSystem.gradeScales
    : DEFAULT_GRADE_SCALES;

  const studentName = student?.profile
    ? `${student.profile.firstName} ${student.profile.lastName}`
    : "Student Name";

  const admissionNum = student?.admissionNumber || student?.studentId || reportData?.studentId || "—";
  const className = reportData?.class || student?.class?.name || "—";

  const generalRemark = remarks?.find((r: any) => r.remarkType === "GENERAL")?.content
    || reportData?.classTeacherRemark
    || "";
  const headteacherRemark = remarks?.find((r: any) => r.remarkType === "HEADTEACHER")?.content
    || reportData?.headmasterRemark
    || "";

  const selCategories: string[] = selConfig?.categories || [
    "Self-Awareness", "Self-Management", "Social Awareness", "Relationship Skills", "Responsible Decision-Making",
  ];

  const grandTotal = subjects.reduce((sum: number, s: any) => {
    return sum + (typeof s.totalScore === "number" ? s.totalScore : parseFloat(s.totalScore) || 0);
  }, 0);

  const average = subjects.length > 0 ? (grandTotal / subjects.length).toFixed(1) : "0.0";

  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}>
      <Card className="max-w-4xl mx-auto shadow-sm">
        <CardHeader className="text-center border-b pb-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <h2 className="text-2xl font-bold">{studentName}</h2>
              <p className="text-muted-foreground font-mono text-sm">{admissionNum}</p>
              {className && <p className="text-sm text-muted-foreground mt-0.5">Class: {className}</p>}
            </div>
            <div className="text-right">
              <Badge className="bg-emerald-600 text-white">Primary</Badge>
              <p className="text-sm text-muted-foreground mt-1">{termName} • {academicYear}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Academic Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-semibold rounded-tl-lg">Subject</th>
                    <th className="p-3 font-semibold text-center">Class Marks</th>
                    <th className="p-3 font-semibold text-center">Exam Marks</th>
                    <th className="p-3 font-semibold text-center">Total</th>
                    <th className="p-3 font-semibold text-center">Grade</th>
                    <th className="p-3 font-semibold text-center rounded-tr-lg">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s: any, i: number) => {
                    const total = typeof s.totalScore === "number" ? s.totalScore : parseFloat(s.totalScore) || 0;
                    const classScore = typeof s.classWorkScore === "number" ? s.classWorkScore : parseFloat(s.classWorkScore) || 0;
                    const examScore = typeof s.examScore === "number" ? s.examScore : parseFloat(s.examScore) || 0;
                    const gi = scales.length > 0 ? lookupGrade(total, scales) : { grade: s.grade || "—", description: "" };
                    return (
                      <tr key={i} className={i % 2 === 0 ? "border-b bg-white" : "border-b bg-muted/20"}>
                        <td className="p-3 font-medium">{s.subjectName}</td>
                        <td className="p-3 text-center">{classScore.toFixed ? classScore.toFixed(1) : classScore}</td>
                        <td className="p-3 text-center">{examScore.toFixed ? examScore.toFixed(1) : examScore}</td>
                        <td className="p-3 text-center font-bold">{total}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-emerald-700">
                            {gi.grade || s.grade}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-medium">{s.position || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 dark:bg-emerald-950/20 font-bold border-t-2 border-emerald-200">
                    <td className="p-3">Total</td>
                    <td colSpan={2} />
                    <td className="p-3 text-center font-black">{grandTotal}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-muted/30 rounded-xl p-3 text-center border">
                <p className="text-2xl font-black">{grandTotal}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Total Score</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center border">
                <p className="text-2xl font-black">{average}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Average</p>
              </div>
            </div>

            <div className="mt-3 p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground">
              <span className="font-semibold text-foreground uppercase">Grade Key: </span>
              {scales.map((s: any, idx: number) => (
                <span key={idx}>
                  <span className="font-bold text-foreground">{s.grade}</span> = {s.description} ({s.minScore}–{s.maxScore})
                  {idx < scales.length - 1 ? " • " : ""}
                </span>
              ))}
            </div>
          </div>

          {/* SEL / Social-Emotional Learning */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Social-Emotional Learning (SEL)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {selCategories.map((cat: string, i: number) => (
                <div key={i} className="border rounded-lg p-4 flex justify-between items-center bg-card">
                  <span className="font-medium text-sm">{cat}</span>
                  <Badge variant="secondary">Excellent</Badge>
                </div>
              ))}
            </div>
            {selConfig?.ratingScale && (
              <div className="mt-3 p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground">
                <span className="font-semibold text-foreground uppercase">Rating Scale: </span>
                {selConfig.ratingScale.join(" • ")}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Remarks</h3>
            <div className="space-y-3">
              <div className="bg-primary/5 p-4 rounded-xl text-sm leading-relaxed border border-primary/10">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Class Teacher's Remark</p>
                <p className="italic">{generalRemark || "A well-rounded student who participates actively in class. Keep it up!"}</p>
              </div>
              {headteacherRemark && (
                <div className="bg-primary/5 p-4 rounded-xl text-sm leading-relaxed border border-primary/10">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Head Teacher's Remark</p>
                  <p className="italic">{headteacherRemark}</p>
                </div>
              )}
            </div>
          </div>

        </CardContent>
      </Card>
    </Suspense>
  );
}
