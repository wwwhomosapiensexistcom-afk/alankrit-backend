import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { paiseToRupees, toISTISOString } from '../utils/formatters';

export interface CustomerFilters {
  search?: string;
}

function buildCustomerWhere(filters: CustomerFilters): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export async function getCustomers(filters: CustomerFilters = {}) {
  const customers = await prisma.customer.findMany({
    where: buildCustomerWhere(filters),
    include: { addresses: true },
    orderBy: { joinDate: 'desc' },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    totalSpent: paiseToRupees(c.totalSpent),
    totalOrders: c.totalOrders,
    joinDate: toISTISOString(c.joinDate),
    addresses: c.addresses.map((a) => ({
      id: a.id,
      street: a.street,
      city: a.city,
      state: a.state,
      pinCode: a.pinCode,
      country: a.country,
      isDefault: a.isDefault,
      createdAt: toISTISOString(a.createdAt),
    })),
  }));
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: true,
      orders: {
        orderBy: { placedAt: 'desc' },
        include: {
          items: true,
        },
      },
    },
  });

  if (!customer) return null;

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    totalSpent: paiseToRupees(customer.totalSpent),
    totalOrders: customer.totalOrders,
    joinDate: toISTISOString(customer.joinDate),
    addresses: customer.addresses.map((a) => ({
      id: a.id,
      street: a.street,
      city: a.city,
      state: a.state,
      pinCode: a.pinCode,
      country: a.country,
      isDefault: a.isDefault,
      createdAt: toISTISOString(a.createdAt),
    })),
    orders: customer.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      subtotal: paiseToRupees(o.subtotal),
      shippingCost: paiseToRupees(o.shippingCost),
      gstAmount: paiseToRupees(o.gstAmount),
      totalAmount: paiseToRupees(o.totalAmount),
      placedAt: toISTISOString(o.placedAt),
      items: o.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: paiseToRupees(item.price),
        size: item.size ?? null,
      })),
    })),
  };
}

export interface AddressInput {
  street: string;
  city: string;
  state: string;
  pinCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone: string;
  addresses: AddressInput[];
  joinDate?: string;
}

export async function createCustomer(input: CreateCustomerInput) {
  const hasDefault = input.addresses.some((a) => a.isDefault);

  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      totalOrders: 0,
      totalSpent: 0,
      joinDate: input.joinDate ? new Date(input.joinDate) : new Date(),
      addresses: {
        create: input.addresses.map((a, index) => ({
          street: a.street,
          city: a.city,
          state: a.state,
          pinCode: a.pinCode,
          country: a.country ?? 'India',
          isDefault: hasDefault ? !!a.isDefault : index === 0,
        })),
      },
    },
  });

  return getCustomerById(customer.id);
}
