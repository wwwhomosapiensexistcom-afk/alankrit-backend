const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products in DB.`);
}
run();
