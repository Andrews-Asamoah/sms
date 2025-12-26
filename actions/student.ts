// "use server";

// import { prismadb } from "@/lib/prisma";

// // Fetch students data
// const getStudentData = async () => {
//   const students = await prismadb.student.findMany({
//     include: {
//       user: true,
//     },
//   });
//   return students.map((student) => ({ gender: student.user.gender }));
// };

// export default getStudentData;
