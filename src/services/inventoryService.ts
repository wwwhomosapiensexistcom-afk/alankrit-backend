import prisma from '../config/database';
import { toISTISOString } from '../utils/formatters';
import logger from '../utils/logger';
import { sendLowStockAlert } from './emailService';

export interface InventoryAdjustmentInput {
  productId: string;
  adjustmentType: 'add' | 'remove' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
}

export async function getInventoryItems() {
  const items = await prisma.inventory.findMany({
    include: {
      product: true,
    },
    orderBy: {
      product: {
        name: 'asc',
      },
    },
  });

  return items.map((item) => ({
    productId: item.productId,
    name: item.product.name,
    sku: item.product.sku,
    category: item.product.categoryId,
    currentStock: item.quantity,
    reorderPoint: item.reorderPoint,
    weightPerUnit: item.product.weightGrams,
    totalWeightGrams: item.weightGrams,
    lastUpdated: toISTISOString(item.lastUpdated),
  }));
}

export async function adjustInventory(input: InventoryAdjustmentInput) {
  if (input.quantity < 0) {
    throw Object.assign(new Error('Quantity must be non-negative'), { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.inventory.findUnique({ where: { productId: input.productId } });

    const currentQuantity = existing?.quantity ?? 0;
    let newQuantity = currentQuantity;

    if (input.adjustmentType === 'add') {
      newQuantity = currentQuantity + input.quantity;
    } else if (input.adjustmentType === 'remove') {
      newQuantity = Math.max(0, currentQuantity - input.quantity);
    } else if (input.adjustmentType === 'set') {
      newQuantity = Math.max(0, input.quantity);
    }

    const quantityChange = newQuantity - currentQuantity;

    if (!existing) {
      const created = await tx.inventory.create({
        data: {
          productId: input.productId,
          quantity: newQuantity,
          reorderPoint: 6,
          weightGrams: newQuantity * product.weightGrams,
          adjustmentHistory: {
            create: {
              adjustment: quantityChange,
              reason: input.reason,
              notes: input.notes,
            },
          },
        },
      });
      return created;
    }

    const updated = await tx.inventory.update({
      where: { id: existing.id },
      data: {
        quantity: newQuantity,
        weightGrams: newQuantity * product.weightGrams,
        adjustmentHistory: {
          create: {
            adjustment: quantityChange,
            reason: input.reason,
            notes: input.notes,
          },
        },
      },
    });

    return updated;
  });

  if (result.quantity <= result.reorderPoint && result.quantity > 0) {
    try {
      await sendLowStockAlert(
        product.name,
        product.sku,
        result.quantity,
        result.reorderPoint,
      );
    } catch (emailError) {
      logger.error('Failed to send low stock alert', {
        error: emailError,
        productId: result.productId,
        quantity: result.quantity,
        reorderPoint: result.reorderPoint,
      });
    }
  }

  return {
    productId: result.productId,
    quantity: result.quantity,
    reorderPoint: result.reorderPoint,
    totalWeightGrams: result.weightGrams,
    lastUpdated: toISTISOString(result.lastUpdated),
  };
}

export async function updateReorderPoint(productId: string, point: number) {
  const updated = await prisma.inventory.update({
    where: { productId },
    data: { reorderPoint: point },
  });

  return {
    productId: updated.productId,
    quantity: updated.quantity,
    reorderPoint: updated.reorderPoint,
    totalWeightGrams: updated.weightGrams,
    lastUpdated: toISTISOString(updated.lastUpdated),
  };
}
