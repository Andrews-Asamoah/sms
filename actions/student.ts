"use server";

import { prismadb } from "@/lib/db";

// Fetch students data
const getStudentData = async () => {
  const students = await prismadb.student.findMany({
    include: {
      user: true,
    },
  });
  return students.map((student) => ({ gender: student.user.gender }));
};

export default getStudentData;
