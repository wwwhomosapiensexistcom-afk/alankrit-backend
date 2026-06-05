import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

interface TokenPayload {
  userId: string;
  role: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

function getTokenFromCookies(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [name, ...rest] = part.trim().split('=');
    if (name === 'access_token') {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token = getTokenFromCookies(req.headers.cookie);
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
    (req as AuthRequest).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
