import type { Request, Response, NextFunction } from 'express';
import { getCustomers, getCustomerById, createCustomer } from '../services/customerService';

export async function listCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query as { search?: string };
    const customers = await getCustomers({ search });
    return res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const customer = await getCustomerById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    return res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function createCustomerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = req.body as any;
    const customer = await createCustomer({
      name: body.name,
      email: body.email,
      phone: body.phone,
      addresses: Array.isArray(body.addresses) ? body.addresses : [],
      joinDate: body.joinDate,
    });

    return res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

import prisma from '../config/database';

export async function updateCustomerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const body = req.body as any;

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name;
    if (body.email !== undefined) dataToUpdate.email = body.email;
    if (body.phone !== undefined) dataToUpdate.phone = body.phone;
    if (body.wishlist !== undefined) dataToUpdate.wishlist = body.wishlist;

    // Handle addresses update if provided
    if (body.addresses !== undefined && Array.isArray(body.addresses)) {
      // Clear existing addresses and recreate them
      await prisma.address.deleteMany({ where: { customerId: id } });
      dataToUpdate.addresses = {
        create: body.addresses.map((a: any, idx: number) => ({
          street: a.street || a.street1 || '',
          city: a.city,
          state: a.state,
          pinCode: a.pin || a.pinCode,
          country: a.country || 'India',
          isDefault: a.isDefault !== undefined ? !!a.isDefault : idx === 0,
        })),
      };
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: dataToUpdate,
      include: { addresses: true },
    });

    // Format properly for frontend storage keys
    const normalized = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      totalSpent: customer.totalSpent,
      totalOrders: customer.totalOrders,
      wishlist: customer.wishlist,
      addresses: customer.addresses.map((a) => ({
        id: a.id,
        street1: a.street,
        city: a.city,
        state: a.state,
        pin: a.pinCode,
        country: a.country,
        isDefault: a.isDefault,
      })),
    };

    return res.json({ success: true, data: normalized });
  } catch (error) {
    next(error);
  }
}
