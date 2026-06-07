import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import type { Request, Response } from 'express';

const router = Router();

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/payment-qr', async (req: Request, res: Response) => {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: 'payment_qr_url' }
    });
    return res.json({ success: true, url: setting ? setting.value : null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch payment QR' });
  }
});

router.post('/payment-qr', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    let url = '';
    if (CLOUDINARY_CONFIGURED) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'alankrit/settings/payment-qr',
            public_id: 'payment_qr',
            overwrite: true,
            resource_type: 'image'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file!.buffer);
      });
      url = uploadResult.secure_url;
    } else {
      // Local fallback
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../../public/uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filename = 'payment_qr.png';
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
      const host = req.protocol + '://' + req.get('host');
      url = `${host}/uploads/${filename}`;
    }

    const setting = await prisma.siteSettings.upsert({
      where: { key: 'payment_qr_url' },
      update: { value: url },
      create: { key: 'payment_qr_url', value: url }
    });

    return res.json({ success: true, url: setting.value });
  } catch (error: any) {
    console.error('QR upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to save payment QR' });
  }
});

router.get('/admin-whatsapp', async (req: Request, res: Response) => {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: 'admin_whatsapp' }
    });
    return res.json({ success: true, value: setting ? setting.value : '919150873583' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch WhatsApp number' });
  }
});

router.post('/admin-whatsapp', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { number } = req.body as { number?: string };
    if (!number) {
      return res.status(400).json({ error: 'WhatsApp number is required' });
    }

    const setting = await prisma.siteSettings.upsert({
      where: { key: 'admin_whatsapp' },
      update: { value: number },
      create: { key: 'admin_whatsapp', value: number }
    });

    return res.json({ success: true, value: setting.value });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to save WhatsApp number' });
  }
});

router.post('/upload', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    let url = '';
    if (CLOUDINARY_CONFIGURED) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'alankrit/settings',
            public_id: `setting_${Date.now()}`,
            overwrite: true,
            resource_type: 'image'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file!.buffer);
      });
      url = uploadResult.secure_url;
    } else {
      // Local fallback
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../../public/uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filename = `setting_${Date.now()}.png`;
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
      const host = req.protocol + '://' + req.get('host');
      url = `${host}/uploads/${filename}`;
    }

    return res.json({ success: true, url });
  } catch (error: any) {
    console.error('Settings image upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload settings image' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { key, value } = req.body as { key?: string; value?: string };
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const setting = await prisma.siteSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });

    return res.json({ success: true, data: setting });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to save settings' });
  }
});

export default router;
