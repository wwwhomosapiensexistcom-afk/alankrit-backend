import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import {
  getInventoryItems,
  adjustInventory as adjustInventoryService,
  updateReorderPoint as updateReorderPointService,
} from '../services/inventoryService';

export async function getInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await getInventoryItems();
    return res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

export async function adjustInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const body = req.body as any;

    const result = await adjustInventoryService({
      productId: body.productId,
      adjustmentType: body.adjustmentType,
      quantity: Number(body.quantity),
      reason: body.reason,
      notes: body.notes,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateReorderPoint(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const body = req.body as any;
    const productId = body.productId as string;
    const point = Number(body.reorderPoint);

    const result = await updateReorderPointService(productId, point);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/inventory/deduct
 * Body: { items: [{ productId: string, quantity: number }] }
 * Called from storefront after successful payment.
 * Atomically checks and deducts stock for all cart items.
 */
export async function deductStock(req: Request, res: Response, next: NextFunction) {
  try {
    const { items } = req.body as { items: { productId: string; quantity: number }[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    // Run all deductions in a single atomic transaction
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory) {
          throw Object.assign(new Error(`Inventory not found for product ${item.productId}`), { status: 404 });
        }

        if (inventory.quantity < item.quantity) {
          // Fetch product name for a friendly error message
          const product = await tx.product.findUnique({ where: { id: item.productId }, select: { name: true } });
          throw Object.assign(new Error(`Insufficient stock for "${product?.name || item.productId}". Only ${inventory.quantity} left.`), { status: 409 });
        }

        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: { decrement: item.quantity },
            adjustmentHistory: {
              create: {
                adjustment: -item.quantity,
                reason: 'Sale',
                notes: `Order placed — ${item.quantity} unit(s) sold`,
              },
            },
          },
        });

        // If stock hits 0, mark product as out of stock
        if (inventory.quantity - item.quantity === 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { inStock: false },
          });
        }
      }
    });

    return res.json({ success: true });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}
