import { Router } from 'express';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { getRazorpay } from '../config/razorpay';

const router = Router();

/**
 * POST /api/payment/create-order
 * Creates a Razorpay order for the given cart total.
 * Body: { amount: number (in rupees), receipt?: string }
 */
router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { amount, receipt, notes } = req.body as {
      amount: number;
      receipt?: string;
      notes?: Record<string, string>;
    };

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    });

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
    });
  } catch (error: any) {
    console.error('Razorpay create-order error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
});

/**
 * POST /api/payment/verify
 * Verifies Razorpay payment signature after successful payment.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
router.post('/verify', (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, error: 'Payment signature verification failed' });
  }

  return res.json({ success: true, paymentId: razorpay_payment_id });
});

export default router;
