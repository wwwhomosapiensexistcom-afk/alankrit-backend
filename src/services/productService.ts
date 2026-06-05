import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { paiseToRupees, rupeesToPaise, toISTISOString } from '../utils/formatters';

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: string;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  category: string;
  price: number; // in rupees
  description?: string;
  material?: string;
  purity?: string;
  weightGrams: number;
  imageUrl?: string;
  images?: string[];
  goldType?: string;
  makingCharge?: number;
  tier9k?: string;
  inStock?: boolean;
  madeToOrder?: boolean;
  isBestseller?: boolean;
  status: string;
  availableSizes?: string[];
  initialStock?: number;
  reorderPoint?: number;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  category?: string;
  price?: number; // rupees
  description?: string;
  material?: string;
  purity?: string;
  weightGrams?: number;
  imageUrl?: string;
  images?: string[];
  goldType?: string;
  makingCharge?: number;
  tier9k?: string;
  inStock?: boolean;
  madeToOrder?: boolean;
  isBestseller?: boolean;
  status?: string;
  availableSizes?: string[];
  stockQuantity?: number;
  reorderPoint?: number;
}

function buildProductWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (filters.category) {
    where.categoryId = filters.category;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export async function getProducts(filters: ProductFilters = {}) {
  const products = await prisma.product.findMany({
    where: buildProductWhere(filters),
    include: { inventory: true, category: true },
    orderBy: { createdAt: 'desc' },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category?.name || 'Uncategorized',
    categoryId: p.categoryId,
    description: p.description,
    material: p.material,
    purity: p.purity,
    imageUrl: p.imageUrl,
    status: p.status,
    availableSizes: p.availableSizes,
    weightGrams: p.weightGrams,
    goldType: p.goldType,
    makingCharge: p.makingCharge,
    tier9k: p.tier9k,
    images: p.images,
    price: paiseToRupees(p.price),
    stockQuantity: p.inventory?.quantity ?? 0,
    reorderPoint: p.inventory?.reorderPoint ?? 0,
    lastUpdated: p.inventory?.lastUpdated
      ? toISTISOString(p.inventory.lastUpdated)
      : null,
  }));
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { inventory: true, category: true },
  });

  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category?.name || 'Uncategorized',
    categoryId: product.categoryId,
    description: product.description,
    material: product.material,
    purity: product.purity,
    imageUrl: product.imageUrl,
    status: product.status,
    availableSizes: product.availableSizes,
    weightGrams: product.weightGrams,
    goldType: product.goldType,
    makingCharge: product.makingCharge,
    tier9k: product.tier9k,
    images: product.images,
    price: paiseToRupees(product.price),
    stockQuantity: product.inventory?.quantity ?? 0,
    reorderPoint: product.inventory?.reorderPoint ?? 0,
    lastUpdated: product.inventory?.lastUpdated
      ? toISTISOString(product.inventory.lastUpdated)
      : null,
  };
}

export async function createProduct(input: CreateProductInput) {
  const existing = await prisma.product.findFirst({
    where: {
      OR: [{ name: input.name }, { sku: input.sku }],
    },
  });

  if (existing) {
    throw Object.assign(new Error('Product with same name or SKU already exists'), {
      status: 400,
    });
  }

  const initialStock = input.initialStock ?? 0;
  const reorderPoint = input.reorderPoint ?? 6;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name: input.name,
        sku: input.sku,
        categoryId: input.category || null,
        price: rupeesToPaise(input.price),
        description: input.description ?? "",
        material: input.material ?? '9K Gold',
        purity: input.purity ?? '37.5%',
        weightGrams: input.weightGrams,
        imageUrl: input.imageUrl ?? "",
        images: input.images ?? [],
        goldType: input.goldType ?? "9k",
        makingCharge: input.makingCharge ?? 0,
        tier9k: input.tier9k,
        inStock: input.inStock ?? true,
        madeToOrder: input.madeToOrder ?? false,
        isBestseller: input.isBestseller ?? false,
        status: input.status,
        availableSizes: input.availableSizes ?? [],
      },
    });

    await tx.inventory.create({
      data: {
        productId: created.id,
        quantity: initialStock,
        reorderPoint,
        weightGrams: input.weightGrams * initialStock,
        adjustmentHistory:
          initialStock > 0
            ? {
                create: {
                  adjustment: initialStock,
                  reason: 'Restock',
                  notes: 'Initial stock',
                },
              }
            : undefined,
      },
    });

    return created;
  });

  return getProductById(product.id);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const data: Prisma.ProductUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.sku !== undefined) data.sku = input.sku;
  if (input.category !== undefined) data.category = input.category ? { connect: { id: input.category } } : { disconnect: true };
  if (input.price !== undefined) data.price = rupeesToPaise(input.price);
  if (input.description !== undefined) data.description = input.description;
  if (input.material !== undefined) data.material = input.material;
  if (input.purity !== undefined) data.purity = input.purity;
  if (input.weightGrams !== undefined) data.weightGrams = input.weightGrams;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.images !== undefined) data.images = input.images;
  if (input.goldType !== undefined) data.goldType = input.goldType;
  if (input.makingCharge !== undefined) data.makingCharge = input.makingCharge;
  if (input.tier9k !== undefined) data.tier9k = input.tier9k;
  if (input.inStock !== undefined) data.inStock = input.inStock;
  if (input.madeToOrder !== undefined) data.madeToOrder = input.madeToOrder;
  if (input.isBestseller !== undefined) data.isBestseller = input.isBestseller;
  if (input.status !== undefined) data.status = input.status;
  if (input.availableSizes !== undefined) data.availableSizes = input.availableSizes;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.product.update({
      where: { id },
      data,
    });

    if (
      input.stockQuantity !== undefined ||
      input.reorderPoint !== undefined ||
      input.weightGrams !== undefined
    ) {
      const inventory = await tx.inventory.findUnique({ where: { productId: id } });

      const quantity =
        input.stockQuantity !== undefined
          ? input.stockQuantity
          : inventory?.quantity ?? 0;
      const reorderPointValue =
        input.reorderPoint !== undefined
          ? input.reorderPoint
          : inventory?.reorderPoint ?? 6;
      const weightPerUnit =
        input.weightGrams !== undefined ? input.weightGrams : existing.weightGrams;

      if (inventory) {
        await tx.inventory.update({
          where: { productId: id },
          data: {
            quantity,
            reorderPoint: reorderPointValue,
            weightGrams: quantity * weightPerUnit,
          },
        });
      } else {
        await tx.inventory.create({
          data: {
            productId: id,
            quantity,
            reorderPoint: reorderPointValue,
            weightGrams: quantity * weightPerUnit,
          },
        });
      }
    }
  });

  return getProductById(id);
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({ where: { id } });
  } catch (error: any) {
    if (error && error.code === 'P2003') {
      // Foreign key violation (e.g., existing order items)
      throw Object.assign(
        new Error('Cannot delete product with existing orders'),
        { status: 400 },
      );
    }
    throw error;
  }
}
