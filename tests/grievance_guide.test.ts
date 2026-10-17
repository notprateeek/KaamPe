import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGenAI } from '../server/services/ai/gemini';
import {
  collectGrievanceFacts,
  generateGrievanceDraft,
  isDraftFaithful,
  parseFacts,
  buildFactOnlyDraft,
} from '../server/services/grievance/guide';
import grievanceRouter from '../server/routes/grievance';

// Mocked Gemini: these tests never make a live call.
vi.mock('../server/services/ai/gemini', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../server/services/ai/gemini')>()),
  getGenAI: vi.fn(),
}));

const generateContent = vi.fn();
const handler = grievanceRouter.stack.find((l) => l.route?.path === '/grievance')!.route!.stack.at(-1)!.handle;

beforeEach(() => {
  vi.mocked(getGenAI).mockReturnValue({ models: { generateContent } } as any);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

async function post(body: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  await handler({ body, sessionProfile: { language: 'hi' } } as any, res as any, vi.fn());
  return { res, body: res.json.mock.calls[0][0] };
}

describe('Guided grievance: collecting facts', () => {
  it('asks only for the missing amount and duration, never for an employer', () => {
    const step = collectGrievanceFacts({ description: 'Payment nahi mili.', facts: {}, unknown: [] }, 'hi');
    expect(step.stage).toBe('questions');
    expect(step.issue).toBe('payment');
    expect(step.questions.map((q) => q.field)).toEqual(['amount', 'duration']);
    expect(step.facts).toEqual({});
    expect(step.message).toMatch(/Pata nahi/);
  });

  it('keeps the exact amount and duration from "₹3200, 8 din." and moves to review', () => {
    const step = collectGrievanceFacts(
      { description: 'Payment nahi mili.', facts: {}, unknown: [], answer: '₹3200, 8 din.', asked: ['amount', 'duration'] },
      'hi'
    );
    expect(step.stage).toBe('review');
    expect(step.facts).toEqual({ amount: 3200, days: 8 });
    expect(step.facts.platform).toBeUndefined();
    expect(step.summary).toBe('₹3200 ki payment 8 din se pending hai.');
  });

  it('accepts "I don\'t know" and never fills the unknown fact', () => {
    const step = collectGrievanceFacts(
      { description: 'Payment pending', facts: { amount: 3200 }, unknown: [], answer: 'pata nahi', asked: ['duration'] },
      'en'
    );
    expect(step.stage).toBe('review');
    expect(step.unknown).toEqual(['duration']);
    expect(step.facts).toEqual({ amount: 3200 });
  });

  it('asks again (without guessing) when the reply has no usable fact', () => {
    const step = collectGrievanceFacts(
      { description: 'Payment pending', facts: {}, unknown: [], answer: 'bahut zyada', asked: ['amount', 'duration'] },
      'en'
    );
    expect(step.stage).toBe('questions');
    expect(step.notUnderstood).toBe(true);
    expect(step.facts).toEqual({});
  });

  it('only asks for what is relevant to the issue', () => {
    expect(collectGrievanceFacts({ description: 'Mera account block ho gaya', facts: {}, unknown: [] }, 'en').questions.map((q) => q.field)).toEqual(['duration']);
    expect(collectGrievanceFacts({ description: 'Mere 500 rupaye kaat liye', facts: {}, unknown: [] }, 'en').stage).toBe('review');
    expect(collectGrievanceFacts({ description: 'Manager rude baat karta hai', facts: {}, unknown: [] }, 'en').stage).toBe('review');
  });

  it('keeps the worker\'s duration unit and reads Devanagari / Gurmukhi digits', () => {
    expect(parseFacts('2 hafte se', ['duration'])).toEqual({ weeks: 2 });
    expect(parseFacts('₹३२०० और ८ दिन', ['amount', 'duration'])).toEqual({ amount: 3200, days: 8 });
    expect(parseFacts('੩੨੦੦ ਰੁਪਏ', ['amount'])).toEqual({ amount: 3200 });
    expect(parseFacts('3,200.50 rupaye', ['amount'])).toEqual({ amount: 3200.5 });
  });

  it('records a platform only when the worker named it', () => {
    expect(collectGrievanceFacts({ description: 'Swiggy ne ₹3200 nahi diye 8 din se', facts: {}, unknown: [] }, 'en').facts.platform).toBe('Swiggy');
    expect(collectGrievanceFacts({ description: 'Payment ₹3200 8 din se pending', facts: {}, unknown: [] }, 'en').facts.platform).toBeUndefined();
  });
});

describe('Guided grievance: drafting', () => {
  it('writes a fact-only draft with ₹3200 and 8 days and no invented employer when Gemini fails', async () => {
    generateContent.mockRejectedValue(new Error('upstream failed'));
    const draft = await generateGrievanceDraft({ description: 'Payment nahi mili.', facts: { amount: 3200, days: 8 }, language: 'en' });
    expect(draft.usedFallback).toBe(true);
    expect(draft.draftMessage).toContain('₹3200');
    expect(draft.draftMessage).toContain('8 days');
    expect(draft.draftMessage).toMatch(/^Dear Support Team,/);
    for (const name of ['Swiggy', 'Zomato', 'Uber', 'Section', 'within']) expect(draft.draftMessage).not.toContain(name);
  });

  it('omits unknown facts from the fallback instead of saying "several days"', () => {
    const { draftMessage } = buildFactOnlyDraft('payment', { amount: 3200 }, 'en');
    expect(draftMessage).toContain('₹3200');
    expect(draftMessage).not.toMatch(/several|some days|\bdays\b/);
    expect(buildFactOnlyDraft('payment', {}, 'hi').draftMessage).not.toMatch(/kuch din|baaki/);
  });

  it.each([
    ['an invented date', 'My ₹3200 payment due on 12/09 is pending for 8 days.'],
    ['a legal section', 'Under Section 15 of the Wages Act, my ₹3200 pending for 8 days must be paid.'],
    ['a deadline', 'Pay my ₹3200, pending for 8 days, within 2 days.'],
    ['an employee id', 'Employee ID 4471: my ₹3200 is pending for 8 days.'],
    ['a recipient platform', 'Dear Zomato, my ₹3200 is pending for 8 days.'],
    ['an entitlement claim', 'My ₹3200 is pending for 8 days and I am entitled to compensation.'],
    ['a changed amount', 'My ₹3000 is pending for 8 days.'],
  ])('rejects a model draft that adds %s', async (_label, draftMessage) => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ summary: 's', draftMessage }) });
    const draft = await generateGrievanceDraft({ description: 'Payment nahi mili.', facts: { amount: 3200, days: 8 }, language: 'en' });
    expect(draft.usedFallback).toBe(true);
    expect(draft.draftMessage).toContain('₹3200');
    expect(draft.draftMessage).not.toBe(draftMessage);
  });

  it('accepts a faithful model draft and keeps the confirmed facts', async () => {
    const text = 'Dear Support Team, my payment of ₹3,200 has been pending for 8 days. Kindly release it. Thank you.';
    generateContent.mockResolvedValue({ text: JSON.stringify({ summary: 'x', draftMessage: text }) });
    const draft = await generateGrievanceDraft({ description: 'Payment nahi mili.', facts: { amount: 3200, days: 8 }, language: 'en' });
    expect(draft.usedFallback).toBe(false);
    expect(draft.draftMessage).toBe(text);
    expect(draft.facts).toEqual({ amount: 3200, days: 8 });
    // The model's own user turn holds the confirmed facts and the wrapped description.
    const contents = generateContent.mock.calls[0][0].contents as string;
    expect(contents).toContain('"amount":3200');
    expect(contents).toContain('"days":8');
    expect((contents.match(/<\/user_input>/g) || []).length).toBe(1);
  });

  it('allows a platform the worker typed into the optional field', () => {
    expect(isDraftFaithful('Dear Support Team, my Porter payment of ₹3200 is pending for 8 days.', { amount: 3200, days: 8, platform: 'Porter' }, 'Payment nahi mili')).toBe(true);
  });
});

describe('POST /api/ai/grievance', () => {
  it('runs the ₹3200 / 8 din conversation and lets the worker correct facts before drafting', async () => {
    const first = await post({ action: 'collect', description: 'Payment nahi mili.' });
    expect(first.body.stage).toBe('questions');
    expect(generateContent).not.toHaveBeenCalled();

    const second = await post({
      action: 'collect',
      description: 'Payment nahi mili.',
      facts: first.body.facts,
      answer: '₹3200, 8 din.',
      asked: first.body.questions.map((q: { field: string }) => q.field),
    });
    expect(second.body.stage).toBe('review');
    expect(second.body.facts).toEqual({ amount: 3200, days: 8 });

    generateContent.mockRejectedValue(new Error('down'));
    const corrected = await post({ action: 'draft', description: 'Payment nahi mili.', facts: { amount: 3500, days: 8 } });
    expect(corrected.body.type).toBe('grievance');
    expect(corrected.body.draftMessage).toContain('₹3500');
    expect(corrected.body.draftMessage).toContain('8 din');
    expect(corrected.body.draftMessage).not.toContain('3200');
    expect(corrected.body.facts).toEqual({ amount: 3500, days: 8 });
  });

  it('rejects invalid facts', async () => {
    const { res } = await post({ action: 'draft', description: 'x', facts: { amount: -5 } });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('masks sensitive numbers before they reach the model', async () => {
    generateContent.mockRejectedValue(new Error('down'));
    await post({ action: 'draft', description: 'Payment nahi mili, account 123456789012', facts: { amount: 3200, days: 8 } });
    expect(JSON.stringify(generateContent.mock.calls)).not.toContain('123456789012');
  });
});
