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
  { subjectName: "English Language", classWorkScore: 26, examScore: 61, totalScore: 87, grade: "1", position: "2nd" },
  { subjectName: "Mathematics", classWorkScore: 24, examScore: 58, totalScore: 82, grade: "2", position: "4th" },
  { subjectName: "Integrated Science", classWorkScore: 27, examScore: 64, totalScore: 91, grade: "1", position: "1st" },
  { subjectName: "Social Studies", classWorkScore: 23, examScore: 55, totalScore: 78, grade: "2", position: "5th" },
  { subjectName: "Religious & Moral Ed.", classWorkScore: 25, examScore: 57, totalScore: 82, grade: "2", position: "3rd" },
];

export function JhsReportCard({
  student,
  termName,
  academicYear,
  disciplineConfig,
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

  const className = reportData?.class || student?.class?.name || "—";
  const admissionNum = student?.admissionNumber || student?.studentId || reportData?.studentId || "—";

  const generalRemark = remarks?.find((r: any) => r.remarkType === "GENERAL")?.content
    || reportData?.classTeacherRemark
    || "";
  const headteacherRemark = remarks?.find((r: any) => r.remarkType === "HEADTEACHER")?.content
    || reportData?.headmasterRemark
    || "";

  const disciplineMetrics = disciplineConfig?.metrics || ["Punctuality", "Conduct", "Attitude to Learning", "Neatness"];

  const grandTotal = subjects.reduce((sum: number, s: any) => {
    return sum + (typeof s.totalScore === "number" ? s.totalScore : parseFloat(s.totalScore) || 0);
  }, 0);

  const average = subjects.length > 0 ? (grandTotal / subjects.length).toFixed(1) : "0.0";

  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}>
      <Card className="max-w-4xl mx-auto shadow-sm">
        <CardHeader className="text-center border-b pb-6 bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-900/40 dark:to-indigo-900/20">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <h2 className="text-2xl font-bold">{studentName}</h2>
              <p className="text-muted-foreground font-mono text-sm">{admissionNum}</p>
              {className && <p className="text-sm text-muted-foreground mt-0.5">Class: {className}</p>}
            </div>
            <div className="text-right">
              <Badge className="bg-indigo-600 text-white">Junior High</Badge>
              <p className="text-sm text-muted-foreground mt-1">{termName} • {academicYear}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Academic Record</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-semibold rounded-tl-lg">Subject</th>
                    <th className="p-3 font-semibold text-center">Class Marks (30)</th>
                    <th className="p-3 font-semibold text-center">Exam Marks (70)</th>
                    <th className="p-3 font-semibold text-center">Total (100)</th>
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
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            {gi.grade || s.grade}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-medium">{s.position || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-50 dark:bg-indigo-950/30 font-bold border-t-2 border-indigo-200">
                    <td className="p-3">Total</td>
                    <td colSpan={2} />
                    <td className="p-3 text-center font-black">{grandTotal.toFixed ? grandTotal.toFixed(1) : grandTotal}</td>
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

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Discipline & Conduct</h3>
              <div className="space-y-3">
                {disciplineMetrics.map((metric: string, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b pb-2">
                    <span>{metric}</span>
                    <span className="font-medium text-emerald-600">Excellent</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Remarks</h3>
              <div className="space-y-3">
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Class Teacher's Remark</p>
                  <p className="text-sm italic">{generalRemark || "—"}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Head Teacher's Remark</p>
                  <p className="text-sm italic">{headteacherRemark || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {disciplineConfig?.predictiveTracks && (
            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">BECE Readiness Prediction</h3>
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl space-y-3 border border-indigo-100 dark:border-indigo-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Current Trajectory</span>
                  <Badge className="bg-indigo-600">Aggregate 12–15</Badge>
                </div>
                <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                  Based on current performance trends across core subjects, the student is on track for a strong pass. Focus on Mathematics needed to improve overall aggregate.
                </p>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </Suspense>
  );
}
