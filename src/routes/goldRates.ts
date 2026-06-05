import { Router } from 'express';
import {
  getRatesHandler,
  updateRatesHandler,
  getTiersHandler,
  updateTiersHandler
} from '../controllers/goldRateController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes for customers
router.get('/rates', getRatesHandler);
router.get('/tiers', getTiersHandler);

// Protected routes for admin
router.put('/rates', requireAuth, updateRatesHandler);
router.put('/tiers', requireAuth, updateTiersHandler);

export default router;
