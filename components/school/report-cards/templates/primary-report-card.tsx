"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export function PrimaryReportCard({
  student,
  termName,
  academicYear,
  selConfig,
  remarks,
}: any) {
  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}>
      <Card className="max-w-4xl mx-auto shadow-sm">
        <CardHeader className="text-center border-b pb-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <h2 className="text-2xl font-bold">{student.profile.firstName} {student.profile.lastName}</h2>
              <p className="text-muted-foreground font-mono text-sm">{student.admissionNumber}</p>
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
                    <th className="p-3 font-semibold text-center rounded-tr-lg">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Mock Data Row */}
                  <tr className="border-b">
                    <td className="p-3 font-medium">Mathematics</td>
                    <td className="p-3 text-center">25.00</td>
                    <td className="p-3 text-center">60.00</td>
                    <td className="p-3 text-center font-bold">85.00</td>
                    <td className="p-3 text-center"><Badge variant="outline" className="text-emerald-700">A</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Social-Emotional Learning (SEL)</h3>
            <div className="grid md:grid-cols-2 gap-4">
               <div className="border rounded-lg p-4 flex justify-between items-center bg-card">
                 <span className="font-medium text-sm">Teamwork & Collaboration</span>
                 <Badge variant="secondary">Excellent</Badge>
               </div>
               <div className="border rounded-lg p-4 flex justify-between items-center bg-card">
                 <span className="font-medium text-sm">Self-Management</span>
                 <Badge variant="secondary">Good</Badge>
               </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Headteacher's Comments</h3>
            <div className="bg-primary/5 p-4 rounded-xl text-sm leading-relaxed border border-primary/10">
              <p className="italic">"{remarks?.[0]?.content || "A well-rounded student who participates actively in class. Keep it up!"}"</p>
            </div>
          </div>

        </CardContent>
      </Card>
    </Suspense>
  );
}
