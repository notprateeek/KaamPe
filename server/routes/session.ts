import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { accountForSession } from './auth.js';

const router = Router();

const OnboardingSchema = z.object({
  language: z.enum(['hi', 'en', 'pa']),
  workerType: z.enum(['delivery', 'driver', 'construction', 'domestic', 'daily_wage', 'street_vendor', 'other']),
  state: z.string().min(2).max(50),
});

router.get('/', (req, res) => {
  res.json({
    session: { ...req.sessionProfile, account: accountForSession(req.sessionId) },
  });
});

router.post('/onboarding', (req, res) => {
  const result = OnboardingSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid onboarding data',
      details: result.error.errors,
    });
  }

  const { language, workerType, state } = result.data;
  const now = Date.now();

  db.prepare(`
    UPDATE sessions
    SET language = ?, worker_type = ?, state = ?, updated_at = ?
    WHERE id = ?
  `).run(language, workerType, state, now, req.sessionId);

  req.sessionProfile = {
    id: req.sessionId,
    language,
    workerType,
    state,
    createdAt: req.sessionProfile?.createdAt || now,
    updatedAt: now,
  };

  res.json({
    success: true,
    session: req.sessionProfile,
  });
});

export default router;
