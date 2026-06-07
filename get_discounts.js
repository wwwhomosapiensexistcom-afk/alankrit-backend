const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const discounts = await prisma.discount.findMany();
  console.log('Discounts in DB:', JSON.stringify(discounts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
