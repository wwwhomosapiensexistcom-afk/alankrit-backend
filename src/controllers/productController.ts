import type { Request, Response, NextFunction } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../services/productService';
import type { AuthRequest } from '../middleware/auth';
import { isNonEmptyString } from '../utils/validators';

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category, status } = req.query as {
      search?: string;
      category?: string;
      status?: string;
    };

    const products = await getProducts({ search, category, status });
    return res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const product = await getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function createProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const body = req.body as any;

    if (!isNonEmptyString(body.name) || !isNonEmptyString(body.sku)) {
      return res.status(400).json({ error: 'Name and SKU are required' });
    }

    const product = await createProduct({
      name: body.name,
      sku: body.sku,
      category: body.category,
      price: Number(body.price),
      description: body.description ?? "",
      material: body.material,
      purity: body.purity,
      weightGrams: Number(body.weightGrams),
      imageUrl: body.imageUrl,
      images: body.images,
      goldType: body.goldType,
      makingCharge: body.makingCharge !== undefined ? Number(body.makingCharge) : undefined,
      tier9k: body.tier9k,
      inStock: body.inStock,
      madeToOrder: body.madeToOrder,
      isBestseller: body.isBestseller,
      status: body.status ?? 'Published',
      availableSizes: Array.isArray(body.availableSizes) ? body.availableSizes : [],
      initialStock: body.initialStock !== undefined ? Number(body.initialStock) : undefined,
      reorderPoint:
        body.reorderPoint !== undefined ? Number(body.reorderPoint) : undefined,
    });

    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function updateProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const body = req.body as any;

    const product = await updateProduct(id, {
      name: body.name,
      sku: body.sku,
      category: body.category,
      price: body.price !== undefined ? Number(body.price) : undefined,
      description: body.description,
      material: body.material,
      purity: body.purity,
      weightGrams:
        body.weightGrams !== undefined ? Number(body.weightGrams) : undefined,
      imageUrl: body.imageUrl,
      images: body.images,
      goldType: body.goldType,
      makingCharge: body.makingCharge !== undefined ? Number(body.makingCharge) : undefined,
      tier9k: body.tier9k,
      inStock: body.inStock,
      madeToOrder: body.madeToOrder,
      isBestseller: body.isBestseller,
      status: body.status,
      availableSizes: body.availableSizes,
      stockQuantity:
        body.stockQuantity !== undefined ? Number(body.stockQuantity) : undefined,
      reorderPoint:
        body.reorderPoint !== undefined ? Number(body.reorderPoint) : undefined,
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    await deleteProduct(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
