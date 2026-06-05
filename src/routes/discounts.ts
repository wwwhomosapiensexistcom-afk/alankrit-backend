import { Router } from 'express';
import {
  listActiveDiscounts,
  listAllDiscounts,
  validateCouponHandler,
  createDiscountHandler,
  updateDiscountHandler,
  deleteDiscountHandler,
} from '../controllers/discountController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', listActiveDiscounts);            // Public — storefront fetches on init
router.get('/all', requireAuth, listAllDiscounts); // Admin — see all including inactive
router.get('/validate/:code', validateCouponHandler); // Public — coupon validation
router.post('/', requireAuth, createDiscountHandler);
router.put('/:id', requireAuth, updateDiscountHandler);
router.delete('/:id', requireAuth, deleteDiscountHandler);

export default router;
