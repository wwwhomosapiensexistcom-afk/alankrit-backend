import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { paiseToRupees, rupeesToPaise, generateOrderNumber, toISTISOString } from '../utils/formatters';
import logger from '../utils/logger';
import { sendOrderConfirmation, sendOrderStatusUpdate } from './emailService';

export interface OrderFilters {
  status?: string;
  customer?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  size?: string;
  price?: number;
}

export interface CreateOrderInput {
  customerId: string;
  items: OrderItemInput[];
  shippingAddress: any;
  deliveryAddress?: any;
  paymentMethod?: string;
  makingCharges?: number;
  subtotal?: number;
  shippingCost?: number;
  gstAmount?: number;
  totalAmount?: number;
  status?: string;
  paymentStatus?: string;
  notes?: string;
}

export interface UpdateOrderInput {
  status?: string;
  trackingNumber?: string | null;
  courierService?: string | null;
  notes?: string | null;
  paymentStatus?: string;
}

function buildOrderWhere(filters: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.customer) {
    where.customerId = filters.customer;
  }

  if (filters.from || filters.to) {
    where.placedAt = {};
    if (filters.from) {
      (where.placedAt as Prisma.DateTimeFilter).gte = new Date(filters.from);
    }
    if (filters.to) {
      (where.placedAt as Prisma.DateTimeFilter).lte = new Date(filters.to);
    }
  }

  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: 'insensitive' } },
      { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
      { customer: { email: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

function mapOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: paiseToRupees(order.subtotal),
    shippingCost: paiseToRupees(order.shippingCost),
    gstAmount: paiseToRupees(order.gstAmount),
    totalAmount: paiseToRupees(order.totalAmount),
    shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : null,
    deliveryAddress: order.deliveryAddress ? JSON.parse(order.deliveryAddress) : null,
    paymentMethod: order.paymentMethod,
    makingCharges: paiseToRupees(order.makingCharges || 0),
    trackingNumber: order.trackingNumber,
    courierService: order.courierService,
    notes: order.notes,
    placedAt: toISTISOString(order.placedAt),
    createdAt: toISTISOString(order.createdAt),
    updatedAt: toISTISOString(order.updatedAt),
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
        }
      : null,
    items: order.items?.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      price: paiseToRupees(item.price),
      size: item.size ?? null,
      name: item.name || item.product?.name || 'Jewellery Item',
      weight: item.weight || item.product?.weightGrams || 0,
      imageUrl: item.product?.imageUrl || '',
      product:
        item.product && {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
        },
    })),
  };
}

export async function getOrders(filters: OrderFilters = {}) {
  const orders = await prisma.order.findMany({
    where: buildOrderWhere(filters),
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { placedAt: 'desc' },
  });

  return orders.map(mapOrder);
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return order ? mapOrder(order) : null;
}

export async function createOrder(input: CreateOrderInput) {
  if (!input.items || input.items.length === 0) {
    throw Object.assign(new Error('Order must contain at least one item'), {
      status: 400,
    });
  }

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Load products and inventory
    const productIds = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const inventories = await tx.inventory.findMany({ where: { productId: { in: productIds } } });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const inventoryMap = new Map(inventories.map((inv) => [inv.productId, inv]));

    let subtotalPaise = 0;
    let calculatedMakingChargesPaise = 0;

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw Object.assign(new Error(`Product not found: ${item.productId}`), {
          status: 400,
        });
      }

      const itemPrice = item.price !== undefined ? rupeesToPaise(item.price) : product.price;
      const lineTotal = itemPrice * item.quantity;
      subtotalPaise += lineTotal;
      calculatedMakingChargesPaise += rupeesToPaise(product.makingCharge || 0) * item.quantity;
    }

    const shippingCostPaise = subtotalPaise >= rupeesToPaise(5000) ? 0 : rupeesToPaise(100);
    const gstAmountPaise = input.gstAmount !== undefined ? rupeesToPaise(input.gstAmount) : Math.round(subtotalPaise * 0.03);
    const totalAmountPaise = input.totalAmount !== undefined ? rupeesToPaise(input.totalAmount) : (subtotalPaise + shippingCostPaise + gstAmountPaise);
    const makingChargesPaise = input.makingCharges !== undefined ? rupeesToPaise(input.makingCharges) : calculatedMakingChargesPaise;

    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(now),
        customerId: input.customerId,
        subtotal: subtotalPaise,
        shippingCost: shippingCostPaise,
        gstAmount: gstAmountPaise,
        totalAmount: totalAmountPaise,
        status: input.status || 'Processing',
        paymentStatus: input.paymentStatus ?? 'Pending',
        shippingAddress: typeof input.shippingAddress === 'string' ? input.shippingAddress : JSON.stringify(input.shippingAddress),
        deliveryAddress: input.deliveryAddress ? JSON.stringify(input.deliveryAddress) : null,
        paymentMethod: input.paymentMethod || 'UPI QR',
        makingCharges: makingChargesPaise,
        notes: input.notes,
        placedAt: now,
      },
    });

    await tx.orderItem.createMany({
      data: input.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const itemPrice = item.price !== undefined ? rupeesToPaise(item.price) : product.price;
        return {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: itemPrice,
          size: item.size ?? null,
          name: product.name,
          weight: product.weightGrams,
        };
      }),
    });

    // Adjust inventory
    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      const inventory = inventoryMap.get(item.productId);

      if (!inventory) {
        // If no inventory exists yet, create one with negative quantity (backorder)
        await tx.inventory.create({
          data: {
            productId: product.id,
            quantity: -item.quantity,
            reorderPoint: 6,
            weightGrams: -item.quantity * product.weightGrams,
            adjustmentHistory: {
              create: {
                adjustment: -item.quantity,
                reason: 'Sale',
                notes: `Order ${order.orderNumber}`,
              },
            },
          },
        });
      } else {
        const newQuantity = inventory.quantity - item.quantity;
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: newQuantity,
            weightGrams: newQuantity * product.weightGrams,
            adjustmentHistory: {
              create: {
                adjustment: -item.quantity,
                reason: 'Sale',
                notes: `Order ${order.orderNumber}`,
              },
            },
          },
        });
      }
    }

    // Update customer totals
    const aggregates = await tx.order.aggregate({
      where: { customerId: input.customerId },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    await tx.customer.update({
      where: { id: input.customerId },
      data: {
        totalOrders: aggregates._count.id,
        totalSpent: aggregates._sum.totalAmount ?? 0,
      },
    });

    return order;
  });

  const fullOrder = await prisma.order.findUnique({
    where: { id: result.id },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });

  if (fullOrder && fullOrder.customer) {
    try {
      await sendOrderConfirmation(
        fullOrder.customer.email,
        fullOrder.customer.name,
        fullOrder.orderNumber,
        paiseToRupees(fullOrder.totalAmount),
        fullOrder.items.map((item: any) => ({
          name: item.product?.name ?? 'Product',
          quantity: item.quantity,
          price: paiseToRupees(item.price),
        })),
      );
    } catch (emailError) {
      logger.error('Failed to send order confirmation email', {
        error: emailError,
        orderId: fullOrder.id,
      });
    }
  }

  return fullOrder ? mapOrder(fullOrder) : null;
}

export async function updateOrder(id: string, input: UpdateOrderInput) {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  const targetStatus = input.status ?? existing.status;
  const requiresShippedOrDelivered =
    input.trackingNumber !== undefined || input.courierService !== undefined;

  if (
    requiresShippedOrDelivered &&
    targetStatus !== 'Shipped' &&
    targetStatus !== 'Delivered'
  ) {
    throw Object.assign(
      new Error('Tracking and courier can only be set for Shipped or Delivered orders'),
      { status: 400 },
    );
  }

  const data: Prisma.OrderUpdateInput = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.trackingNumber !== undefined) data.trackingNumber = input.trackingNumber;
  if (input.courierService !== undefined) data.courierService = input.courierService;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.paymentStatus !== undefined) data.paymentStatus = input.paymentStatus;

  const updated = await prisma.order.update({
    where: { id },
    data,
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });

  if (input.status && input.status !== existing.status && updated.customer) {
    try {
      await sendOrderStatusUpdate(
        updated.customer.email,
        updated.customer.name,
        updated.orderNumber,
        input.status,
        input.trackingNumber ?? updated.trackingNumber ?? undefined,
      );
    } catch (emailError) {
      logger.error('Failed to send status update email', {
        error: emailError,
        orderId: updated.id,
        newStatus: input.status,
      });
    }
  }

  return mapOrder(updated);
}
