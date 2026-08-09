"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export function KindergartenReportCard({
  student,
  termName,
  academicYear,
  developmentalConfig,
  remarks,
}: any) {
  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}>
      <Card className="max-w-4xl mx-auto shadow-sm">
        <CardHeader className="text-center border-b pb-6 bg-muted/10">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <h2 className="text-2xl font-bold">{student.profile.firstName} {student.profile.lastName}</h2>
            </div>
            <div className="text-right">
              <Badge className="bg-blue-500/10 text-blue-700">Kindergarten</Badge>
              <p className="text-sm text-muted-foreground mt-1">{termName} • {academicYear}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Foundational Skills</h3>
            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-3">
                 <h4 className="font-medium text-sm text-blue-700">Literacy & Reading</h4>
                 <div className="bg-muted/30 p-3 rounded-lg flex justify-between text-sm">
                   <span>Letter Recognition</span>
                   <Badge className="bg-emerald-100 text-emerald-800">Mastered</Badge>
                 </div>
                 <div className="bg-muted/30 p-3 rounded-lg flex justify-between text-sm">
                   <span>Phonics & Sounds</span>
                   <Badge className="bg-emerald-100 text-emerald-800">Mastered</Badge>
                 </div>
               </div>

               <div className="space-y-3">
                 <h4 className="font-medium text-sm text-blue-700">Numeracy & Logic</h4>
                 <div className="bg-muted/30 p-3 rounded-lg flex justify-between text-sm">
                   <span>Counting 1-20</span>
                   <Badge className="bg-amber-100 text-amber-800">Developing</Badge>
                 </div>
               </div>
            </div>

            <div className="mt-6 p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground">
              <span className="font-semibold text-foreground uppercase">Grade / Rating Key: </span>
              Mastered = Consistently demonstrates skill &bull; Developing = Progressing with guidance &bull; Emerging = Initial introduction phase
            </div>
          </div>

        </CardContent>
      </Card>
    </Suspense>
  );
}
