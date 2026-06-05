import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@alankrit.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hash,
        name: 'Super Admin',
        role: 'admin'
      }
    });
    console.log('Seeded admin@alankrit.com');
  } else {
    console.log('Admin exists');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
