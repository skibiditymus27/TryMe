import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { generateDisplayToken } from '../services/tokenService.js';

const rotateSchema = z.object({
  currentToken: z.string().length(8).optional()
});

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ token: generateDisplayToken(8) });
});

router.post('/rotate', (req: Request, res: Response) => {
  const parsed = rotateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  return res.json({ token: generateDisplayToken(8), previous: parsed.data.currentToken ?? null });
});

export default router;
