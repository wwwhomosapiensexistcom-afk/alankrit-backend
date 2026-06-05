import type { Request, Response, NextFunction } from 'express';
import { getGoldRates, updateGoldRates, getGoldTiers, updateGoldTiers } from '../services/goldRateService';
import type { AuthRequest } from '../middleware/auth';

export async function getRatesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await getGoldRates();
    return res.json({ success: true, data: rates });
  } catch (error) {
    next(error);
  }
}

export async function updateRatesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { rate9k, rate14k, rate18k, rate24k } = req.body;
    if (rate9k === undefined || rate14k === undefined || rate18k === undefined) {
      return res.status(400).json({ error: 'rate9k, rate14k, and rate18k are required' });
    }

    const updated = await updateGoldRates(
      Number(rate9k),
      Number(rate14k),
      Number(rate18k),
      rate24k ? Number(rate24k) : undefined
    );
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function getTiersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tiers = await getGoldTiers();
    return res.json({ success: true, data: tiers });
  } catch (error) {
    next(error);
  }
}

export async function updateTiersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { tier1, tier2, tier3 } = req.body;
    if (!tier1 || !tier2 || !tier3) {
      return res.status(400).json({ error: 'tier1, tier2, tier3 are required' });
    }

    const updated = await updateGoldTiers(Number(tier1), Number(tier2), Number(tier3));
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
