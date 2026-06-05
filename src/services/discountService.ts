import prisma from '../config/database';

export async function getActiveDiscounts() {
  const now = new Date();
  return prisma.discount.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAllDiscounts() {
  return prisma.discount.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function validateCoupon(code: string) {
  const now = new Date();
  const discount = await prisma.discount.findFirst({
    where: {
      code: code.toUpperCase().trim(),
      type: 'COUPON',
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
  return discount;
}

export async function createDiscount(data: {
  code: string;
  label: string;
  type: string;
  discountKind: string;
  value: number;
  categoryId?: string | null;
  isActive?: boolean;
  expiresAt?: Date | null;
}) {
  return prisma.discount.create({
    data: {
      ...data,
      code: data.code.toUpperCase().trim(),
    },
    include: { category: true },
  });
}

export async function updateDiscount(
  id: string,
  data: Partial<{
    code: string;
    label: string;
    type: string;
    discountKind: string;
    value: number;
    categoryId: string | null;
    isActive: boolean;
    expiresAt: Date | null;
  }>
) {
  if (data.code) data.code = data.code.toUpperCase().trim();
  return prisma.discount.update({
    where: { id },
    data,
    include: { category: true },
  });
}

export async function deleteDiscount(id: string) {
  return prisma.discount.delete({ where: { id } });
}
