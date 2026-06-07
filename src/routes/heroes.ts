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
    cb(null, 'hero-' + uniqueSuffix + ext);
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
function uploadHeroToCloudinary(buffer: Buffer, originalName: string): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const filenameWithoutExt = path.parse(originalName).name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const publicId = `${Date.now()}-${filenameWithoutExt}`;

    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          resource_type: 'image',
          folder: 'alankrit/heroes',
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

// ─── GET /api/heroes (Public) ──────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const showAll = req.query.all === 'true';
    const whereClause = showAll ? {} : { isActive: true };

    const banners = await prisma.heroBanner.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
    });

    return res.json({ success: true, data: banners });
  } catch (error) {
    console.error('Failed to get hero banners:', error);
    return res.status(500).json({ error: 'Failed to retrieve hero banners' });
  }
});

// ─── POST /api/heroes (Admin Auth Required) ─────────────────────────────────
router.post('/', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Check if 5 banners already exist
    const count = await prisma.heroBanner.count();
    if (count >= 5) {
      return res.status(400).json({ error: 'Maximum 5 banners uploaded. Remove one to add a new one.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Determine the next order number (max current order + 1, or 1 if empty)
    const maxOrderBanner = await prisma.heroBanner.findFirst({
      orderBy: { order: 'desc' },
    });
    const nextOrder = maxOrderBanner ? maxOrderBanner.order + 1 : 1;

    let imageUrl = '';
    let publicId: string | null = null;

    // Upload to Cloudinary if configured
    if (CLOUDINARY_CONFIGURED && req.file.buffer) {
      try {
        const cloudResult = await uploadHeroToCloudinary(req.file.buffer, req.file.originalname);
        imageUrl = cloudResult.url;
        publicId = cloudResult.publicId;
      } catch (cloudErr) {
        console.error('Cloudinary hero upload failed, falling back to disk:', cloudErr);
      }
    }

    // Fallback to local storage if not uploaded to Cloudinary
    if (!imageUrl && req.file.filename) {
      const host = req.protocol + '://' + req.get('host');
      imageUrl = `${host}/uploads/${req.file.filename}`;
      publicId = req.file.filename;
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Failed to upload hero image' });
    }

    // Save to database
    const newBanner = await prisma.heroBanner.create({
      data: {
        imageUrl,
        publicId,
        order: nextOrder,
        isActive: true,
      },
    });

    return res.json({ success: true, data: newBanner });
  } catch (error: any) {
    console.error('Failed to create hero banner:', error);
    return res.status(500).json({ error: error.message || 'Failed to save hero banner' });
  }
});

// ─── DELETE /api/heroes/:id (Admin Auth Required) ───────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { id } = req.params;

    const banner = await prisma.heroBanner.findUnique({
      where: { id },
    });

    if (!banner) {
      return res.status(404).json({ error: 'Hero banner not found' });
    }

    // Delete from Cloudinary if applicable
    if (banner.publicId) {
      if (CLOUDINARY_CONFIGURED && banner.publicId.includes('/')) {
        try {
          await cloudinary.uploader.destroy(banner.publicId, { resource_type: 'image' });
        } catch (cloudErr) {
          console.error('Cloudinary hero delete error:', cloudErr);
        }
      } else {
        // Local file deletion
        const filePath = path.join(uploadsDir, banner.publicId);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // Delete from database
    await prisma.heroBanner.delete({
      where: { id },
    });

    // Reorder remaining banners to maintain sequential order (1 to N)
    const remainingBanners = await prisma.heroBanner.findMany({
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remainingBanners.length; i++) {
      await prisma.heroBanner.update({
        where: { id: remainingBanners[i].id },
        data: { order: i + 1 },
      });
    }

    return res.json({ success: true, message: 'Hero banner deleted successfully' });
  } catch (error) {
    console.error('Failed to delete hero banner:', error);
    return res.status(500).json({ error: 'Failed to delete hero banner' });
  }
});

// ─── PATCH /api/heroes/reorder (Admin Auth Required) ────────────────────────
router.patch('/reorder', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { banners } = req.body; // Expects array of { id: string, order: number }

    if (!banners || !Array.isArray(banners)) {
      return res.status(400).json({ error: 'Invalid reorder request format' });
    }

    // Update all banner orders in a transaction
    await prisma.$transaction(
      banners.map((b: { id: string; order: number }) =>
        prisma.heroBanner.update({
          where: { id: b.id },
          data: { order: b.order },
        })
      )
    );

    return res.json({ success: true, message: 'Hero banners reordered successfully' });
  } catch (error) {
    console.error('Failed to reorder hero banners:', error);
    return res.status(500).json({ error: 'Failed to reorder hero banners' });
  }
});

// ─── PATCH /api/heroes/:id (Admin Auth Required - to toggle isActive) ────────
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { id } = req.params;
    const { isActive, order } = req.body;

    const dataToUpdate: any = {};
    if (typeof isActive === 'boolean') dataToUpdate.isActive = isActive;
    if (typeof order === 'number') dataToUpdate.order = order;

    const updated = await prisma.heroBanner.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update hero banner:', error);
    return res.status(500).json({ error: 'Failed to update hero banner' });
  }
});

export default router;
