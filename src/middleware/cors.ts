import cors from 'cors';
import type { RequestHandler } from 'express';
import { ENV } from '../config/env';

const allowedOrigins = [
  ENV.FRONTEND_URL,
  ENV.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://alankrit.com',
  'https://www.alankrit.com',
  'https://alankrit-rak.pages.dev',
].filter(Boolean);

export const corsMiddleware: RequestHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any *.pages.dev subdomain for Cloudflare preview deployments
    if (origin.endsWith('.pages.dev')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
});
