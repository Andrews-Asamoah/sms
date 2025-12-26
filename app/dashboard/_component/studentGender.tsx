// "use client";

// import getStudentData from "@/actions/student";
// import {
//   ChartConfig,
//   ChartContainer,
//   ChartLegend,
//   ChartLegendContent,
//   ChartTooltip,
//   ChartTooltipContent,
// } from "@/components/ui/chart";
// import { Gender } from "@prisma/client";
// import { useEffect, useState } from "react";
// import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

// interface Student {
//   gender: Gender;
// }

// interface ChartData {
//   gender: string;
//   count: number;
// }

// const transformStudentData = (students: Student[]) => {
//   const genderCount = students.reduce(
//     (acc: { male: number; female: number }, student) => {
//       if (student.gender === Gender.MALE) {
//         acc.male += 1;
//       } else if (student.gender === Gender.FEMALE) {
//         acc.female += 1;
//       }
//       return acc;
//     },
//     { male: 0, female: 0 }
//   );
//   return [
//     { gender: "Male", count: genderCount.male },
//     { gender: "Female", count: genderCount.female },
//   ];
// };

// const chartConfig = {
//   male: {
//     label: "Male",
//     color: "#2563eb",
//   },
//   female: {
//     label: "Female",
//     color: "#60a5fa",
//   },
// } satisfies ChartConfig;

// const StudentGenderChart = () => {
//   const [chartData, setChartData] = useState<ChartData[]>([]);

//   useEffect(() => {
//     const fetchData = async () => {
//       const studentData = await getStudentData();
//       const transformedData = transformStudentData(studentData);
//       setChartData(transformedData);
//     };
//     fetchData();
//   }, []);

//   return (
//     <ChartContainer config={chartConfig} className="h-[200px] w-full">
//       <BarChart accessibilityLayer data={chartData}>
//         <CartesianGrid vertical={false} />
//         <XAxis
//           dataKey="gender"
//           tickLine={false}
//           tickMargin={10}
//           axisLine={false}
//           tickFormatter={(value) => value.slice(0, 3)}
//         />
//         <ChartTooltip content={<ChartTooltipContent />} />
//         <ChartLegend content={<ChartLegendContent />} />
//         <Bar dataKey="count" fill="var(--color-male)" radius={4} />
//         <Bar dataKey="count" fill="var(--color-female)" radius={4} />
//       </BarChart>
//     </ChartContainer>
//   );
// };

// export default StudentGenderChart;
