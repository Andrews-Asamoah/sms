import { prismadb } from "@/lib/db";

export const getUserByEmail = async (email: string) => {
  try {
    const user = await prismadb.user.findUnique({ where: { email } });
    return user;
  } catch (error) {
    return null;
  }
};

export const getUserByUsername = async (username: string) => {
  try {
    const user = await prismadb.user.findUnique({ where: { username } });
    return user;
  } catch (error) {
    return null;
  }
};

export const getExistingAcademicYear = async (name: string) => {
  try {
    const academicYear = await prismadb.academicYear.findUnique({
      where: { name },
    });
    return academicYear;
  } catch (error) {
    return null;
  }
};

export const getExistingClass = async (name: string) => {
  try {
    const Class = await prismadb.class.findUnique({
      where: { name },
    });
    return Class;
  } catch (error) {
    return null;
  }
};

export const getExistingSubject = async (name: string) => {
  try {
    const Subject = await prismadb.subject.findUnique({
      where: { name },
    });
    return Subject;
  } catch (error) {
    return null;
  }
};
