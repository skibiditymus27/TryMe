import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(32, 'Display name must be at most 32 characters')
});

const router = Router();

router.post('/update', (req: Request, res: Response) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { displayName } = parsed.data;
  // In a real build we would persist to a datastore keyed by a token/session.
  res.json({ displayName, updatedAt: new Date().toISOString() });
});

export default router;
