import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
import {
  getOrders,
  getOrderById,
  createOrder as createOrderService,
  updateOrder as updateOrderService,
} from '../services/orderService';

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
       return res.status(401).json({ error: 'Unauthorised' });
    }

    const { status, customer, from, to, search } = req.query as {
      status?: string;
      customer?: string;
      from?: string;
      to?: string;
      search?: string;
    };

    let targetCustomerId = customer;

    if (authReq.user.role !== 'admin') {
      const prisma = require('../config/database').default;
      const customerRecord = await prisma.customer.findUnique({ where: { email: authReq.user.email } });
      if (!customerRecord) {
        return res.json({ success: true, data: [] });
      }
      targetCustomerId = customerRecord.id;
    }

    const orders = await getOrders({ status, customer: targetCustomerId, from, to, search });
    return res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
       return res.status(401).json({ error: 'Unauthorised' });
    }

    const { id } = req.params;
    const order = await getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (authReq.user.role !== 'admin') {
      const prisma = require('../config/database').default;
      const customerRecord = await prisma.customer.findUnique({ where: { email: authReq.user.email } });
      if (!customerRecord || order.customer?.id !== customerRecord.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
       return res.status(401).json({ error: 'Unauthorised' });
    }
    if (authReq.user.role !== 'admin' && authReq.user.role !== 'customer') {
       return res.status(403).json({ error: 'Forbidden' });
    }

    const body = req.body as any;
    let targetCustomerId = body.customerId;

    if (authReq.user.role === 'customer' || !targetCustomerId) {
      const prisma = require('../config/database').default;
      const customerRecord = await prisma.customer.findUnique({ where: { email: authReq.user.email } });
      if (!customerRecord) {
        return res.status(400).json({ error: 'Customer profile not found for this user' });
      }
      targetCustomerId = customerRecord.id;
    }

    const order = await createOrderService({
      customerId: targetCustomerId,
      items: Array.isArray(body.items) ? body.items : [],
      shippingAddress: body.shippingAddress,
      paymentStatus: body.paymentStatus,
    });

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const body = req.body as any;

    const order = await updateOrderService(id, {
      status: body.status,
      trackingNumber: body.trackingNumber,
      courierService: body.courierService,
      notes: body.notes,
      paymentStatus: body.paymentStatus,
    });

    return res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}
