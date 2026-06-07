import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
import {
  getActiveDiscounts,
  getAllDiscounts,
  validateCoupon,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from '../services/discountService';

export async function listActiveDiscounts(req: Request, res: Response, next: NextFunction) {
  try {
    const discounts = await getActiveDiscounts();
    return res.json({ success: true, data: discounts });
  } catch (error) {
    next(error);
  }
}

export async function listAllDiscounts(req: Request, res: Response, next: NextFunction) {
  try {
    const discounts = await getAllDiscounts();
    return res.json({ success: true, data: discounts });
  } catch (error) {
    next(error);
  }
}

export async function validateCouponHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    const discount = await validateCoupon(code);
    if (!discount) {
      return res.status(404).json({ success: false, error: 'Invalid or expired coupon code' });
    }
    return res.json({ success: true, data: discount });
  } catch (error) {
    next(error);
  }
}

export async function validateCouponPostHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, total } = req.body as { code?: string; total?: number };
    if (!code) {
      return res.status(400).json({ valid: false, message: 'Coupon code is required' });
    }
    
    const discount = await validateCoupon(code);
    if (!discount) {
      return res.json({ valid: false, message: 'Invalid or expired code' });
    }
    
    const orderTotal = total || 0;
    if (discount.minOrderValue && orderTotal < discount.minOrderValue) {
      return res.json({
        valid: false,
        message: `Minimum order value of ₹${discount.minOrderValue.toLocaleString()} not met`
      });
    }
    
    return res.json({
      valid: true,
      discount: {
        type: discount.discountKind === 'PERCENT' ? 'percentage' : 'flat',
        value: discount.value
      },
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    next(error);
  }
}

export async function createDiscountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const body = req.body as any;
    const discount = await createDiscount({
      code: body.code,
      label: body.label,
      type: body.type,
      discountKind: body.discountKind,
      value: Number(body.value),
      minOrderValue: body.minOrderValue !== undefined ? Number(body.minOrderValue) : 0,
      categoryId: body.categoryId || null,
      isActive: body.isActive !== false,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
    return res.status(201).json({ success: true, data: discount });
  } catch (error) {
    next(error);
  }
}

export async function updateDiscountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    const body = req.body as any;
    const data: any = {};
    if (body.code !== undefined) data.code = body.code;
    if (body.label !== undefined) data.label = body.label;
    if (body.type !== undefined) data.type = body.type;
    if (body.discountKind !== undefined) data.discountKind = body.discountKind;
    if (body.value !== undefined) data.value = Number(body.value);
    if (body.minOrderValue !== undefined) data.minOrderValue = Number(body.minOrderValue);
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const discount = await updateDiscount(id, data);
    return res.json({ success: true, data: discount });
  } catch (error) {
    next(error);
  }
}

export async function deleteDiscountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    await deleteDiscount(id);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
