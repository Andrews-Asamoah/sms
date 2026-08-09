"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

interface CrecheReportCardProps {
  student: any; // Type to be refined
  termName: string;
  academicYear: string;
  developmentalConfig: any;
  remarks: any[];
}

export function CrecheReportCard({
  student,
  termName,
  academicYear,
  developmentalConfig,
  remarks,
}: CrecheReportCardProps) {
  // Skeleton for developmental milestones Grid
  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}>
      <Card className="max-w-4xl mx-auto shadow-sm print:shadow-none print:border-none">
        <CardHeader className="text-center border-b pb-6">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <h2 className="text-2xl font-bold">{student.profile.firstName} {student.profile.lastName}</h2>
              <p className="text-muted-foreground">{student.admissionNumber}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="bg-primary/5">Creche Level</Badge>
              <p className="text-sm text-muted-foreground mt-1">{termName} • {academicYear}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Developmental Milestones</h3>
            <div className="grid md:grid-cols-2 gap-6">
               {/* Example static categories based on configs */}
               <div className="space-y-3">
                 <h4 className="font-medium text-sm text-primary">Social & Emotional</h4>
                 <div className="bg-muted/30 p-3 rounded-lg flex justify-between text-sm">
                   <span>Plays well with others</span>
                   <Badge className="bg-emerald-100 text-emerald-800">Developing Well</Badge>
                 </div>
                 <div className="bg-muted/30 p-3 rounded-lg flex justify-between text-sm">
                   <span>Follows simple routines</span>
                   <Badge className="bg-emerald-100 text-emerald-800">Developing Well</Badge>
                 </div>
               </div>

               <div className="space-y-3">
                 <h4 className="font-medium text-sm text-primary">Language & Communication</h4>
                 <div className="bg-muted/30 p-3 rounded-lg flex justify-between text-sm">
                   <span>Expresses needs clearly</span>
                   <Badge className="bg-amber-100 text-amber-800">Still Developing</Badge>
                 </div>
               </div>
            </div>

            <div className="mt-4 p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground">
              <span className="font-semibold text-foreground uppercase">Grade / Rating Key: </span>
              Developing Well = Milestone consistently achieved &bull; Still Developing = Milestone progressing with support &bull; Needs Support = Early stage development
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Teacher's Remarks</h3>
            <div className="bg-primary/5 p-4 rounded-xl text-sm leading-relaxed">
              {remarks.length > 0 ? (
                remarks.map((rm, i) => <p key={i} className="mb-2">{rm.content}</p>)
              ) : (
                <p className="text-muted-foreground italic">No remarks recorded for this term.</p>
              )}
            </div>
          </div>

        </CardContent>
      </Card>
    </Suspense>
  );
}
