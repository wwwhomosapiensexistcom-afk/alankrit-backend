import dotenv from 'dotenv';
import path from 'path';

// On Railway, env vars are injected directly — no .env file needed.
// Only load .env files in local development.
if (!process.env.DATABASE_URL) {
  const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.local';
  dotenv.config({ path: path.resolve(process.cwd(), envFile) });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3001),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRY: process.env.JWT_EXPIRY ?? '7d',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ?? '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL ?? 'noreply@alankrit.com',
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME ?? 'Alankrit',
};
