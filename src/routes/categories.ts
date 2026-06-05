import { Router } from 'express';
import {
  listCategories,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler
} from '../controllers/categoryController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', listCategories);
router.post('/', requireAuth, createCategoryHandler);
router.put('/:id', requireAuth, updateCategoryHandler);
router.delete('/:id', requireAuth, deleteCategoryHandler);

export default router;
