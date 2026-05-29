import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  const setId = "cmplwgpii002jvct264rn3dhk";
  const set = await prisma.reportCardSet.findUnique({
    where: { id: setId },
    select: {
      id: true,
      name: true,
      status: true,
    }
  });
  console.log("Set:", set);
}

main().catch(console.error);
