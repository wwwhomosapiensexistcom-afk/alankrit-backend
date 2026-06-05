import type { Request, Response, NextFunction } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await getCategories();
    return res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function createCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    const category = await createCategory({ name, slug });
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    const category = await updateCategory(id, { name, slug });
    return res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await deleteCategory(id);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
