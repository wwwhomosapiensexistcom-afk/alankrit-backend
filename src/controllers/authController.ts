import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword, generateToken } from '../services/authService';
import { isNonEmptyString, isValidEmail } from '../utils/validators';
import type { AuthRequest } from '../middleware/auth';
import { ENV } from '../config/env';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, phone, password } = req.body as {
      email?: string;
      phone?: string;
      password?: string;
    };

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }
    if (!isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Password is required' });
    }

    let userEmail = email;

    // If phone is provided, find the customer to get their email
    if (phone && !email) {
      const customer = await prisma.customer.findFirst({ where: { phone } });
      if (customer) {
        userEmail = customer.email;
      } else {
        userEmail = `${phone}@alankrit.internal`; // Fallback for phone-only users without email
      }
    }

    if (!userEmail) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Attempt to get the linked customer profile
    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
      include: { addresses: true },
    });

    const token = generateToken({ userId: user.id, role: user.role, email: user.email });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({
      success: true,
      token,
      data: {
        user: {
          id: customer ? customer.id : user.id,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: customer ? customer.phone : undefined,
          wishlist: customer ? customer.wishlist : [],
          addresses: customer ? customer.addresses.map(a => ({
            id: a.id,
            street1: a.street,
            city: a.city,
            state: a.state,
            pin: a.pinCode,
            country: a.country,
            isDefault: a.isDefault
          })) : []
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    res.clearCookie('access_token', { path: '/' });
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, phone, name, password, role } = req.body as {
      email?: string;
      phone?: string;
      name?: string;
      password?: string;
      role?: string;
    };

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }
    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!isNonEmptyString(password) || password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password is required and must be at least 8 characters' });
    }

    const authEmail = email || `${phone}@alankrit.internal`;

    const existingUser = await prisma.user.findUnique({ where: { email: authEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Account already exists' });
    }

    if (email) {
      const existingCustomerByEmail = await prisma.customer.findUnique({ where: { email } });
      if (existingCustomerByEmail) {
        return res.status(400).json({ error: 'Email is already registered' });
      }
    }

    const passwordHash = await hashPassword(password);
    const assignedRole = 'customer'; // CRITICAL FIX: Force all public registrations to customer role

    // Create User record for auth
    const user = await prisma.user.create({
      data: {
        email: authEmail,
        name,
        password: passwordHash,
        role: assignedRole,
      },
    });

    let customer = null;
    if (assignedRole === 'customer') {
      // Create Customer record for orders
      customer = await prisma.customer.create({
        data: {
          name,
          email: authEmail,
          phone: phone || '',
          totalSpent: 0,
          totalOrders: 0,
        },
      });
    }

    const token = generateToken({ userId: user.id, role: user.role, email: user.email });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.status(201).json({
      success: true,
      token,
      data: {
        user: {
          id: customer ? customer.id : user.id,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: customer ? customer.phone : undefined,
          wishlist: [],
          addresses: []
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: authReq.user.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
      include: { addresses: true }
    });

    return res.json({
      success: true,
      data: {
        id: customer ? customer.id : user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: customer ? customer.phone : undefined,
        wishlist: customer ? customer.wishlist : [],
        addresses: customer ? customer.addresses.map(a => ({
          id: a.id,
          street1: a.street,
          city: a.city,
          state: a.state,
          pin: a.pinCode,
          country: a.country,
          isDefault: a.isDefault
        })) : []
      },
    });
  } catch (error) {
    next(error);
  }
}
