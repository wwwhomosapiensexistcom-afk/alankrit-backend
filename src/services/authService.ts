import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface TokenPayload {
  userId: string;
  role: string;
  email?: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRY as any });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
}
