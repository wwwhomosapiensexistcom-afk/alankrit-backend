const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@alankrit.com' }});
  console.log('Admin user:', admin ? 'Found' : 'NOT FOUND');
}
run();
