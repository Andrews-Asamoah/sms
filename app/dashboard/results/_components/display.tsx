"use client";

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
import { FaAngleLeft, FaPrint } from "react-icons/fa6";

const DisplayResults = () => {
  return (
    <Card className="grid px-10 py-5">
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
            <h1>Index No: Asamoah Andrews</h1>
            <h1>Email: Asamoah Andrews</h1>
            <h1>
              Attendace: <span>60</span> out of <span>61</span>
            </h1>
          </div>
          <div className="">
            <h1>Class: 6A</h1>
            <h1>Student ID: 156181</h1>
            <h1>
              Position: 1st <span>Out of 38</span>
            </h1>
          </div>
          <div className="">
            <h1>Class Teacher&apos;s Name: Asamoah Andrews</h1>
            <h1>Class Teacher&apos;s Contact: 059462789</h1>
            <h1>
              Class Teacher&apos;s Remarks: Should be more attentive in class
              and extra tutorials at home is recommended
            </h1>
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
            <FaAngleLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button size="lg">
            Print Result Slip
            <FaPrint className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DisplayResults;
