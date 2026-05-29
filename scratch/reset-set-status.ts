import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  const setId = "cmplwgpii002jvct264rn3dhk";
  
  const updatedSet = await prisma.reportCardSet.update({
    where: { id: setId },
    data: { status: "GENERATED" },
  });
  
  console.log("Reset set status to GENERATED:", updatedSet);
}

main().catch(console.error);
