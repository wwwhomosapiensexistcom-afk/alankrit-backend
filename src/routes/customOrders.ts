import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../config/database';

const router = express.Router();

// ─── Cloudinary Configuration ──────────────────────────────────────────────
const CLOUDINARY_CONFIGURED =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== 'your-api-key' &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_API_SECRET !== 'your-api-secret';

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
    secure: true,
  });
}

// Local fallback uploads directory
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const memoryStorage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'custom-' + uniqueSuffix + ext);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|webp/;
  const isValid =
    allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, png, webp) are allowed'));
  }
};

const upload = multer({
  storage: CLOUDINARY_CONFIGURED ? memoryStorage : diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter,
});

// Helper: upload buffer to Cloudinary
function uploadToCloudinary(buffer: Buffer, originalName: string): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const publicId = `alankrit/custom-orders/${Date.now()}-${path.parse(originalName).name}`;

    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          resource_type: 'image',
          folder: 'alankrit/custom-orders',
          transformation: [
            { quality: 'auto:best', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      )
      .end(buffer);
  });
}

// ─── POST /api/custom-orders (Public) ───────────────────────────────────────
router.post('/', upload.single('referenceImage'), async (req: Request, res: Response) => {
  try {
    const { itemType, occasion, budgetRange, description, name, phone, email } = req.body;

    if (!itemType || !budgetRange || !description || !name || !phone || !email) {
      return res.status(400).json({ error: 'All fields except occasion and referenceImage are required' });
    }

    let referenceImage = '';

    // Upload to Cloudinary if configured and file is provided
    if (req.file) {
      if (CLOUDINARY_CONFIGURED && req.file.buffer) {
        try {
          const cloudResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
          referenceImage = cloudResult.url;
        } catch (cloudErr) {
          console.error('Cloudinary custom order upload failed, falling back to disk:', cloudErr);
        }
      }

      // Fallback to local storage if not uploaded to Cloudinary
      if (!referenceImage && req.file.filename) {
        const host = req.protocol + '://' + req.get('host');
        referenceImage = `${host}/uploads/${req.file.filename}`;
      }
    }

    const customOrder = await prisma.customOrder.create({
      data: {
        itemType,
        occasion: occasion || null,
        budgetRange,
        description,
        referenceImage: referenceImage || null,
        name,
        phone,
        email,
        status: 'new',
      },
    });

    return res.status(201).json({ success: true, data: customOrder });
  } catch (error: any) {
    console.error('Failed to create custom order:', error);
    return res.status(500).json({ error: error.message || 'Failed to save custom order inquiry' });
  }
});

// ─── GET /api/custom-orders (Admin Auth Required) ───────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const inquiries = await prisma.customOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: inquiries });
  } catch (error) {
    console.error('Failed to get custom orders:', error);
    return res.status(500).json({ error: 'Failed to retrieve custom order inquiries' });
  }
});

// ─── PATCH /api/custom-orders/:id (Admin Auth Required) ─────────────────────
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = await prisma.customOrder.update({
      where: { id },
      data: { status },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update custom order:', error);
    return res.status(500).json({ error: 'Failed to update custom order status' });
  }
});

export default router;
