const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const discount = await prisma.discount.upsert({
    where: { code: 'SAVE10' },
    update: {
      minOrderValue: 5000,
      isActive: true,
      expiresAt: null,
      value: 10,
      discountKind: 'PERCENT'
    },
    create: {
      code: 'SAVE10',
      label: '10% Discount Code',
      type: 'COUPON',
      discountKind: 'PERCENT',
      value: 10,
      minOrderValue: 5000,
      isActive: true,
      expiresAt: null
    }
  });
  console.log('Created/Verified coupon:', discount);
}
main().catch(console.error).finally(() => prisma.$disconnect());
