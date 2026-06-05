const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function run() {
  const hash = await bcrypt.hash('Admin@2025', 10);
  await prisma.user.update({
    where: { email: 'admin@alankrit.com' },
    data: { password: hash }
  });
  console.log('Password updated.');
}
run();
