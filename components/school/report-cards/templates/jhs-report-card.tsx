"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export function JhsReportCard({
  student,
  termName,
  academicYear,
  disciplineConfig,
  remarks,
}: any) {
  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}>
      <Card className="max-w-4xl mx-auto shadow-sm">
        <CardHeader className="text-center border-b pb-6 bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-900/40 dark:to-indigo-900/20">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <h2 className="text-2xl font-bold">{student.profile.firstName} {student.profile.lastName}</h2>
              <p className="text-muted-foreground font-mono text-sm">{student.admissionNumber}</p>
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
                  <tr className="border-b">
                    <td className="p-3 font-medium">Integrated Science</td>
                    <td className="p-3 text-center">26.50</td>
                    <td className="p-3 text-center">62.00</td>
                    <td className="p-3 text-center font-bold">88.50</td>
                    <td className="p-3 text-center"><Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">1</Badge></td>
                    <td className="p-3 text-center font-medium">2nd</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Discipline & Conduct</h3>
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm border-b pb-2">
                   <span>Punctuality</span>
                   <span className="font-medium text-emerald-600">Excellent</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b pb-2">
                   <span>Attitude to Work</span>
                   <span className="font-medium text-emerald-600">Very Good</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b pb-2">
                   <span>Respect for Rules</span>
                   <span className="font-medium text-amber-600">Satisfactory</span>
                 </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">BECE Readiness Prediction</h3>
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl space-y-3 border border-indigo-100 dark:border-indigo-900">
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Current Trajectory</span>
                   <Badge className="bg-indigo-600">Aggregate 12-15</Badge>
                 </div>
                 <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                   Based on current performance trends across core subjects, the student is on track for a strong pass. Focus on Mathematics needed to improve overall aggregate.
                 </p>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </Suspense>
  );
}
