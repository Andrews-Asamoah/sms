import prisma from "./lib/prisma";

async function main() {
  try {
    const count = await prisma.announcement.count();
    console.log("Announcement count:", count);
  } catch (error) {
    console.error("Prisma error:", error);
  }
}

main();
