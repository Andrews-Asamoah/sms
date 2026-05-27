import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('../lib/prisma');
  const count = await prisma.gradingSystem.count({ where: { isSystemDefault: true } });
  console.log('System Default Count:', count);
  const defaults = await prisma.gradingSystem.findMany({
    where: { isSystemDefault: true },
    include: { gradeScales: true }
  });
  console.log('Defaults:', JSON.stringify(defaults, null, 2));
}

main()
  .catch(console.error);
