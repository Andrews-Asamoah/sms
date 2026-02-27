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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Added Link import
import { toast } from "sonner"; // Added toast import

interface ClassReportsClientProps {
  classData: any;
  reportCardSet: any;
  schoolSlug: string;
}

export function ClassReportsClient({
  classData,
  reportCardSet,
  schoolSlug,
}: ClassReportsClientProps) {
  const router = useRouter();

  const reportCards = reportCardSet.reportCards || [];

  const handleGenerate = async () => {
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/report-cards/sets/${reportCardSet.id}/generate`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate reports");
      }

      toast.success("Reports generated successfully");
      router.refresh();
    } catch (error) {
      toast.error("Error generating reports");
    }
  };

  return (
    <Card className="bg-background shadow-sm border overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Total Score</TableHead>
              <TableHead>Average</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportCards.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-48 text-center text-muted-foreground"
                >
                  No report cards have been generated for this set yet.
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                    >
                      Generate Reports Now
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reportCards.map((rc: any) => {
                const data = rc.data as any;
                return (
                  <TableRow
                    key={rc.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {rc.student.studentId}
                    </TableCell>
                    <TableCell className="font-medium">
                      {rc.student.profile.firstName}{" "}
                      {rc.student.profile.lastName}
                    </TableCell>
                    <TableCell>{data?.totalScore || "-"}</TableCell>
                    <TableCell>{data?.average || "-"}%</TableCell>
                    <TableCell>
                      {data?.position ? (
                        <Badge variant="outline" className="font-bold">
                          {data.position}
                          {data.positionSuffix || ""}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          rc.publishedAt ? "bg-green-500" : "bg-yellow-500"
                        }
                      >
                        {rc.publishedAt ? "Published" : "Generated"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View Report"
                        asChild
                      >
                        <Link
                          href={`/${schoolSlug}/admin/reports/report-cards/students/${rc.studentId}?setId=${reportCardSet.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Print Report">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
