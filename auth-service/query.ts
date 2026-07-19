import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.$queryRaw`SELECT * FROM zcasher WHERE address = 'u1hru7mj89zrlrwsa62uywlxpqcqc6nvaxt6vlxestprqa6hfv2vu3uhc9wtnn0tqjnvmaydp3zg0ql2x4drapfplrsaky3mmdelqcu6n9ykasukt47cgav5k7055srupg6z4dfkrlr88kl9plw03jp6ejr8dvqzpzf7yatws7xg6s6fuy'`;
  console.log(user);
  const byId = await prisma.$queryRaw`SELECT * FROM zcasher WHERE id = 1772`;
  console.log(byId);
}
main().catch(console.error).finally(() => prisma.$disconnect());
