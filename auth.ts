import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prismadb } from "./lib/db";
import authConfig from "./auth.config";

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  pages: {
    signIn: "/login",
    error: "/error",
  },
  events: {},
  callbacks: {
    // async jwt({ token }) {
    //   if (!token.sub) return token;
    //   const existingUser = await getUserByEmail(token.sub);
    //   if (!existingUser) return token;
    //   token.image = existingUser.image;
    // },
  },
  adapter: PrismaAdapter(prismadb),
  session: { strategy: "jwt" },
  ...authConfig,
});
