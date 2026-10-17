import { Router } from 'express';
import { z } from 'zod';
import { sendApiError } from '../middleware/errorHandler.js';
import { redactSensitive } from '../services/ai/safety.js';
import {
  GRIEVANCE_FIELDS,
  GrievanceFactsSchema,
  cleanFacts,
  collectGrievanceFacts,
  detectIssue,
  generateGrievanceDraft,
} from '../services/grievance/guide.js';

/**
 * POST /api/ai/grievance - guided complaint drafting.
 *
 * Stateless: the client sends back the description and the facts collected so
 * far. `collect` (no model call) parses the worker's latest answer and returns
 * the next questions or a review of the facts; `draft` writes the complaint
 * from the confirmed facts. Nothing is ever sent or submitted anywhere.
 */
const router = Router();

const FieldList = z.array(z.enum(GRIEVANCE_FIELDS)).max(GRIEVANCE_FIELDS.length).default([]);

const GrievanceRequestSchema = z.object({
  action: z.enum(['collect', 'draft']),
  language: z.enum(['hi', 'en', 'pa']).optional(),
  description: z.string().trim().min(1).max(2000),
  facts: GrievanceFactsSchema.optional(),
  unknown: FieldList,
  answer: z.string().trim().max(500).optional(),
  dontKnow: z.boolean().optional(),
  asked: FieldList,
});

router.post('/grievance', async (req, res) => {
  const parsed = GrievanceRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError(req, res, 400, 'validation_failed');
  }
  const body = parsed.data;
  const profileLang = req.sessionProfile?.language;
  const language = body.language ?? (profileLang === 'en' || profileLang === 'pa' ? profileLang : 'hi');
  // Aadhaar/bank/OTP-like numbers never reach the model.
  const description = redactSensitive(body.description);
  const facts = cleanFacts(body.facts);

  if (body.action === 'collect') {
    return res.json(
      collectGrievanceFacts(
        {
          description,
          facts,
          unknown: body.unknown,
          answer: body.answer === undefined ? undefined : redactSensitive(body.answer),
          dontKnow: body.dontKnow,
          asked: body.asked,
        },
        language
      )
    );
  }

  const draft = await generateGrievanceDraft({
    description,
    facts,
    unknown: body.unknown,
    language,
    issue: detectIssue(description),
  });
  return res.json({ type: 'grievance', intent: 'grievance', ...draft });
});

export default router;
