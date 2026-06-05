import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
} from '../controllers/productController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', requireAuth, createProductHandler);
router.put('/:id', requireAuth, updateProductHandler);
router.delete('/:id', requireAuth, deleteProductHandler);

export default router;
