import prisma from "./lib/prisma";

async function main() {
  const notifications = await prisma.notification.findMany({
    where: {
      link: { contains: "admin" },
    },
    take: 10,
  });
  console.log(
    "Notifications with 'admin' in link:",
    JSON.stringify(notifications, null, 2),
  );
}

main();
