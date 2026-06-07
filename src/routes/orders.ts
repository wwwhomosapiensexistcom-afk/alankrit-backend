import { Router } from 'express';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
} from '../controllers/orderController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, listOrders);
router.get('/:id', requireAuth, getOrder);
router.post('/', requireAuth, createOrder);
router.put('/:id', requireAuth, updateOrderStatus);
router.patch('/:id/status', requireAuth, updateOrderStatus);

export default router;
