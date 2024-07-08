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
