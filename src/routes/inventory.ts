import { Router } from 'express';
import {
  getInventory,
  adjustInventory,
  updateReorderPoint,
  deductStock,
} from '../controllers/inventoryController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getInventory);
router.put('/adjust', requireAuth, adjustInventory);
router.patch('/reorder-point', requireAuth, updateReorderPoint);
// Called from storefront after successful payment — no auth, but validates stock atomically
router.post('/deduct', deductStock);

export default router;
