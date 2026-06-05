import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { v2 as cloudinary } from 'cloudinary';

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
  console.log('☁️  Cloudinary: Configured and ready');
} else {
  console.log('⚠️  Cloudinary: Not configured — using local disk storage as fallback');
}

// ─── Local disk fallback ────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Memory storage — we stream to Cloudinary from buffer; disk as fallback
const memoryStorage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter,
});

// ─── Helper: upload buffer to Cloudinary ───────────────────────────────────
function uploadToCloudinary(buffer: Buffer, originalName: string): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const publicId = `alankrit/products/${Date.now()}-${path.parse(originalName).name}`;

    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          resource_type: 'image',
          folder: 'alankrit/products',
          transformation: [
            // Auto-format: converts to WebP/AVIF for modern browsers automatically
            { quality: 'auto:best', fetch_format: 'auto' },
            // Resize to max 1200px wide while keeping aspect ratio (no upscaling)
            { width: 1200, height: 1200, crop: 'limit' },
          ],
          // White background fill for transparent PNGs (important for jewellery)
          background: 'white',
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      )
      .end(buffer);
  });
}

// ─── POST /api/upload/product-image ────────────────────────────────────────
router.post(
  '/product-image',
  requireAuth,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // ── Cloudinary path ──────────────────────────────────────────────────
      if (CLOUDINARY_CONFIGURED && req.file.buffer) {
        try {
          const { url, publicId } = await uploadToCloudinary(req.file.buffer, req.file.originalname);
          return res.json({
            success: true,
            data: { url, publicId, provider: 'cloudinary' },
          });
        } catch (cloudErr) {
          console.error('Cloudinary upload failed, falling back to disk:', cloudErr);
          // Fall through to disk fallback if Cloudinary fails
        }
      }

      // ── Disk fallback path ───────────────────────────────────────────────
      if (req.file.filename) {
        const host = req.protocol + '://' + req.get('host');
        const fileUrl = `${host}/uploads/${req.file.filename}`;
        return res.json({
          success: true,
          data: { url: fileUrl, publicId: req.file.filename, provider: 'local' },
        });
      }

      return res.status(500).json({ error: 'Upload failed: no file path available' });
    } catch (error) {
      console.error('Image upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }
  },
);

// ─── DELETE /api/upload/product-image/:publicId ────────────────────────────
router.delete('/product-image/:publicId', requireAuth, async (req: Request, res: Response) => {
  try {
    // publicId may be URL-encoded (e.g. "alankrit/products/...")
    const publicId = decodeURIComponent(req.params.publicId);

    // If it looks like a Cloudinary public ID (contains slash or "alankrit/")
    if (CLOUDINARY_CONFIGURED && publicId.includes('/')) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        return res.json({ success: true, message: 'Image deleted from Cloudinary' });
      } catch (cloudErr) {
        console.error('Cloudinary delete error:', cloudErr);
      }
    }

    // Local disk fallback
    const filePath = path.join(uploadsDir, publicId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error('Image delete error:', error);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
