import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomerHandler,
  updateCustomerHandler,
} from '../controllers/customerController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, listCustomers);
router.get('/:id', requireAuth, getCustomer);
router.post('/', requireAuth, createCustomerHandler);
router.patch('/:id', requireAuth, updateCustomerHandler);

export default router;
