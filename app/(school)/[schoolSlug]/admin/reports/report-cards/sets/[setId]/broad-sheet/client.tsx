"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface BroadSheetClientProps {
  set: any;
  schoolSlug: string;
}

export function BroadSheetClient({ set, schoolSlug }: BroadSheetClientProps) {
  const reportCards = set.reportCards || [];

  // Extract all subjects across all students for headers
  const subjects = useMemo(() => {
    const subjectList = new Set<string>();
    reportCards.forEach((rc: any) => {
      const data = rc.data as any;
      data.subjects?.forEach((s: any) => {
        subjectList.add(s.subjectName);
      });
    });
    return Array.from(subjectList);
  }, [reportCards]);

  const exportToExcel = () => {
    const wsData = reportCards.map((rc: any) => {
      const data = rc.data as any;
      const row: any = {
        "Student Name": `${rc.student.profile.firstName} ${rc.student.profile.lastName}`,
        "Admission No": rc.student.admissionNumber || rc.student.studentId,
      };

      subjects.forEach((subj) => {
        const score = data.subjects?.find((s: any) => s.subjectName === subj);
        row[subj] = score ? score.totalScore : "-";
      });

      row["Total"] = data.totalScore;
      row["Average"] = data.average;
      row["Position"] = `${data.position}${data.positionSuffix}`;

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Broad Sheet");
    XLSX.writeFile(wb, `${set.name}_Broad_Sheet.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={exportToExcel} variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <Card className="bg-background border shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="min-w-[200px] border-r">
                  Student Name
                </TableHead>
                {subjects.map((s) => (
                  <TableHead key={s} className="text-center border-r px-2">
                    {s}
                  </TableHead>
                ))}
                <TableHead className="text-center font-bold border-r">
                  Total
                </TableHead>
                <TableHead className="text-center font-bold">Pos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportCards.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={subjects.length + 3}
                    className="h-48 text-center text-muted-foreground"
                  >
                    No report cards have been generated yet.
                  </TableCell>
                </TableRow>
              ) : (
                reportCards.map((rc: any) => {
                  const data = rc.data as any;
                  return (
                    <TableRow key={rc.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium border-r">
                        {rc.student.profile.firstName}{" "}
                        {rc.student.profile.lastName}
                      </TableCell>
                      {subjects.map((s) => {
                        const score = data.subjects?.find(
                          (as: any) => as.subjectName === s,
                        );
                        return (
                          <TableCell key={s} className="text-center border-r">
                            {score ? score.totalScore : "-"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold border-r bg-muted/20">
                        {data.totalScore}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {data.position}
                        {data.positionSuffix}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
