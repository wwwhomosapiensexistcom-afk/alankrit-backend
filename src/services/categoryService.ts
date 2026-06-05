import prisma from '../config/database';

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' }
  });
}

export async function createCategory(data: { name: string, slug: string }) {
  return prisma.category.create({
    data
  });
}

export async function updateCategory(id: string, data: { name: string, slug: string }) {
  return prisma.category.update({
    where: { id },
    data
  });
}

export async function deleteCategory(id: string) {
  // First update products that use this category to have categoryId null or a default
  await prisma.product.updateMany({
    where: { categoryId: id },
    data: { categoryId: null }
  });
  
  return prisma.category.delete({
    where: { id }
  });
}
