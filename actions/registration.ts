"use server";

import * as z from "zod";
import {
  CreateAcademicYearSchema,
  RegisterClassSchema,
  RegisterSubjectSchema,
  UpdateClassSchema,
  UpdateSubjectSchema,
} from "@/schemas";
import { prismadb } from "@/lib/db";
import {
  getExistingAcademicYear,
  getExistingClass,
  getExistingSubject,
} from ".";

// function to create an Academic Year
export const registerAcademicYear = async (
  values: z.infer<typeof CreateAcademicYearSchema>
) => {
  const validatedFields = CreateAcademicYearSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid Fields!" };
  }

  const { name, date } = validatedFields.data;

  // check if the academic year already exists
  const existingAcademicYear = await getExistingAcademicYear(name);
  if (existingAcademicYear) {
    return { error: "Academic Year already exist!" };
  }

  try {
    await prismadb.$transaction(async (prisma) => {
      // Create Academic Year
      const academicYear = await prismadb.academicYear.create({
        data: {
          name,
          startDate: date.startDate,
          endDate: date.endDate,
        },
      });

      // Create the three terms with null startDate and endDate

      const terms = ["Term 1", "Term 2", "Term 3"];
      const termPromises = terms.map((termName) =>
        prisma.term.create({
          data: {
            name: termName,
            startDate: null,
            endDate: null,
            academicYearName: academicYear.name,
          },
        })
      );

      await Promise.all(termPromises);
    });

    return { success: "Academic year and terms created successfully!" };
  } catch (error) {
    return { error: "Failed to create academic year and terms." };
  }
};

// function to delete an AcademicYear
export async function deleteAcademicYear(id: string) {
  try {
    const academicYear = await prismadb.academicYear.deleteMany({
      where: { id },
    });

    if (!academicYear) {
      throw new Error("Academic year not found");
    }
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    } else {
      return {
        error: "An unknown error occurred while deleting the Academic Year",
      };
    }
  }
}

// function to create a Class
export const registerClass = async (
  values: z.infer<typeof RegisterClassSchema>
) => {
  const validatedFields = RegisterClassSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid Fields!" };
  }

  const { name } = validatedFields.data;

  // check if the academic year already exists
  const existingClass = await getExistingClass(name);
  if (existingClass) {
    return { error: "Class already exist!" };
  }

  await prismadb.class.create({
    data: {
      name,
    },
  });
  return { success: "Class successfully created!" };
};

// function to update a Class
export const updateClass = async (
  id: string | undefined,
  values: z.infer<typeof UpdateClassSchema>
) => {
  const validatedFields = UpdateClassSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid Fields!" };
  }

  const { name } = validatedFields.data;

  // check if the academic year already exists
  // const existingClass = await getExistingClass(name);
  // if (existingClass) {
  //   return { error: "Class already exist!" };
  // }

  await prismadb.class.update({
    where: { id },
    data: {
      name,
    },
  });
  return { success: "Class updated created!" };
};

// function to delete a Class
export async function deleteClass(id: string) {
  const Class = await prismadb.class.deleteMany({ where: { id } });

  if (Class == null)
    return {
      error: "Class not found",
    };
}

// function to create a Subject
export const registerSubject = async (
  values: z.infer<typeof RegisterSubjectSchema>
) => {
  const validatedFields = RegisterClassSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid Fields!" };
  }

  const { name } = validatedFields.data;

  // check if the academic year already exists
  const existingSubject = await getExistingSubject(name);
  if (existingSubject) {
    return { error: "Class already exist!" };
  }

  await prismadb.subject.create({
    data: {
      name,
    },
  });
  return { success: "Subject successfully created!" };
};

// function to update a Class
export const updateSubject = async (
  id: string | undefined,
  values: z.infer<typeof UpdateSubjectSchema>
) => {
  const validatedFields = UpdateSubjectSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid Fields!" };
  }

  const { name } = validatedFields.data;

  // check if the academic year already exists
  // const existingClass = await getExistingClass(name);
  // if (existingClass) {
  //   return { error: "Class already exist!" };
  // }

  await prismadb.subject.update({
    where: { id },
    data: {
      name,
    },
  });
  return { success: "Subject updated successfully" };
};

// function to delete a Class
export async function deleteSubject(id: string) {
  const Subject = await prismadb.subject.deleteMany({ where: { id } });

  if (!Subject)
    return {
      error: "Subject not found",
    };
}
