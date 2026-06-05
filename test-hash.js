const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function run() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@alankrit.com' }});
  const valid = await bcrypt.compare('Admin@2025', admin.password);
  console.log('Password valid:', valid);
}
run();
