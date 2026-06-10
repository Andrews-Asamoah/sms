import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const { prisma } = await import("../lib/prisma");

  // Find all users with role 'headteacher'
  const headteacherUsers = await prisma.user.findMany({
    where: { role: "headteacher" }
  });

  console.log(`Found ${headteacherUsers.length} users with role 'headteacher' in the user table.`);

  for (const user of headteacherUsers) {
    const memberships = await prisma.member.findMany({
      where: { userId: user.id }
    });
    console.log(`User: ${user.name} (${user.email}) has ${memberships.length} memberships.`);
    for (const m of memberships) {
      console.log(`  - OrgId: ${m.organizationId}, Role: ${m.role}`);
    }
  }
}

main()
  .catch((e) => console.error(e));
