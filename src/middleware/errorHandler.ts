import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const status = (err as any).status ?? 500;
  const message = (err as any).message ?? 'Internal server error';
  res.status(status).json({ error: message });
};
