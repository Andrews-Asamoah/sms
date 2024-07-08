import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";

const DisplayResults = () => {
  return (
    <Card className="grid">
      <CardHeader className="flex flex-row gap-14 justify-center items-center">
        <div className="relative w-20 h-24">
          <Image alt="logo" src="/wis-logo.png" fill />
        </div>
        <div className="grid gap-3">
          <h1 className="font-bold text-xl uppercase">
            wesley international school - adweso, koforidua
          </h1>
          <div className="grid gap-4 grid-flow-col">
            <div className="grid gap-2">
              <h1>
                <strong>Contact:</strong> 0249818556
              </h1>
              <h1>
                <strong>GPS ADDRESS:</strong> EN-075-3409
              </h1>
            </div>
            <div className="">
              <h1>
                <strong>P.O.BOX:</strong> KF 222
              </h1>
              <h1>
                <strong>Email:</strong> info@wis.com
              </h1>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-10">
        <h1 className="flex justify-center text-lg uppercase text-primary font-bold">
          Results slip for first term, 2024-2025 academic year
        </h1>
        <div className="grid grid-cols-3">
          <div className="">
            <h1>Name: Asamoah Andrews</h1>
          </div>
          <div className="">
            <h1>Name: Asamoah Andrews</h1>
          </div>
          <div className="">
            <h1>Name: Asamoah Andrews</h1>
          </div>
        </div>
        <Table className="border">
          <TableCaption>Your provisional terminal report</TableCaption>
          <TableHeader>
            <TableRow className="bg-gray-100 uppercase">
              <TableHead className="border-r min-w-[420px]">subject</TableHead>
              <TableHead className="border-r">Class Score (30%)</TableHead>
              <TableHead className="border-r">Exam Score (70%)</TableHead>
              <TableHead className="border-r">Total Score (100%)</TableHead>
              <TableHead className="border-r">Grade</TableHead>
              <TableHead className="border-r">Position</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody></TableBody>
          <TableFooter>
            <TableRow className="">
              <TableCell>Total Marks</TableCell>
              <TableCell>1000</TableCell>
              <TableCell>Marks Obtained</TableCell>
              <TableCell>800</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <div className="flex justify-center gap-5">
          <Button variant="outline" size="lg">
            Back
          </Button>
          <Button size="lg">Print Result Slip</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DisplayResults;
