import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * UI checks for document Q&A and guided grievance (voice: voice_e2e.spec.ts).
 * - Grievance runs against the real server. Collecting facts never calls Gemini;
 *   the draft call may use Gemini or, if it is unavailable, the fact-only
 *   fallback. The assertions hold for both.
 * - Document explain/ask responses are MOCKED with
 *   page.route, so these tests never need a live Gemini call for them.
 */

async function completeOnboarding(page: Page) {
  await page.goto('/');
  const hindiBtn = page.getByRole('button', { name: /हिन्दी/i });
  if (await hindiBtn.isVisible()) {
    await hindiBtn.click();
    await page.getByRole('button', { name: /Delivery/i }).click();
    await page.getByRole('button', { name: /Aage badhein/i }).click();
    await expect(page.getByText('Namaste 👋')).toBeVisible();
  }
}

const PLATFORMS = /Swiggy|Zomato|Uber|Ola|Porter|Rapido|Blinkit|Zepto/i;

test.describe('Guided grievance', () => {
  test('Help: asks for missing facts, keeps ₹3200 / 8 din, and lets the draft be edited and copied', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByRole('tab', { name: /Payment dispute help/i }).click();
    await page.getByPlaceholder(/Swiggy ka ₹3200/i).fill('Payment nahi mili.');
    await page.getByRole('button', { name: /Draft banayein/i }).click();

    // KaamPe asks only for the amount and how long it has been pending.
    await expect(page.getByText('Kitne rupaye ki payment baaki hai?')).toBeVisible();
    await expect(page.getByText('Payment kitne din se pending hai?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pata nahi' })).toBeVisible();

    await page.getByLabel('Aapka jawab').fill('₹3200, 8 din.');
    await page.getByRole('button', { name: 'Bhejein', exact: true }).click();

    // Facts summary + editable draft (never sent automatically).
    await expect(page.getByText('₹3200 ki payment 8 din se pending hai.').last()).toBeVisible({ timeout: 30000 });
    const draft = page.locator('#dispute-draft');
    await expect(draft).toHaveValue(/3,?200/, { timeout: 30000 });
    await expect(draft).toHaveValue(/8/);
    expect(await draft.inputValue()).not.toMatch(PLATFORMS);
    await expect(page.getByText(/KaamPe yeh sandesh khud nahi bhejta/)).toBeVisible();

    await draft.fill('Namaste, meri ₹3200 ki payment 8 din se pending hai. Kripya release karein.');
    await page.getByRole('button', { name: /Copy karein/i }).click();
    await expect(page.getByText(/Copy ho gaya!/i)).toBeVisible();

    // Correct a fact and regenerate.
    await page.getByRole('button', { name: 'Jaankari badlein' }).click();
    await page.getByLabel('Rakam (₹)').fill('3500');
    await page.getByRole('button', { name: 'Draft banayein' }).last().click();
    await expect(page.locator('#dispute-draft')).toHaveValue(/3,?500/, { timeout: 30000 });
  });

  test('Chat: "Payment nahi mili" leads to questions and "Pata nahi" is accepted', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByPlaceholder(/Kaam, paise, rights/i).fill('Payment nahi mili');
    await page.getByRole('button', { name: 'Poochhein' }).click();
    await expect(page.getByText('Kitne rupaye ki payment baaki hai?')).toBeVisible({ timeout: 30000 });

    await page.getByLabel('Aapka jawab').fill('3200 rupaye');
    await page.getByRole('button', { name: 'Bhejein', exact: true }).click();
    await expect(page.getByText('Payment kitne din se pending hai?').last()).toBeVisible();
    await page.getByRole('button', { name: 'Pata nahi' }).click();

    const draft = page.locator('textarea[id^="chat-"][id$="-draft"]');
    await expect(draft).toHaveValue(/3,?200/, { timeout: 30000 });
    // Unknown duration is not invented.
    expect(await draft.inputValue()).not.toMatch(/kuch din|several days|\d+\s*din/i);
    expect(await draft.inputValue()).not.toMatch(PLATFORMS);
  });
});

test.describe('Document questions (mocked AI responses)', () => {
  test('shows the answer with the supporting excerpt and page, and says when the document has no answer', async ({ page }) => {
    await page.route('**/api/document/explain', (route) =>
      route.fulfill({
        json: {
          success: true,
          documentId: 'doc_00000000-0000-4000-8000-000000000001',
          explanation: { whatIsThis: 'Delivery partner agreement.', importantPoints: [], money: [], dates: [], cautions: [], readable: true },
        },
      })
    );
    let askBody: any = null;
    await page.route('**/api/document/ask', async (route) => {
      askBody = route.request().postDataJSON();
      const notFound = /insurance/i.test(askBody.question);
      await route.fulfill({
        json: notFound
          ? { success: true, found: false, answer: 'Is document mein is sawaal ka saaf jawab nahi mila.', evidence: [] }
          : {
              success: true,
              found: true,
              answer: 'Pickup ke baad cancel karne par Rs. 50 katega.',
              evidence: [{ excerpt: 'a fee of Rs. 50 will be deducted from the partner payout', page: 1 }],
            },
      });
    });

    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByRole('tab', { name: /Document samjhein/i }).click();
    await page.locator('#doc-file-input').setInputFiles(path.resolve('tests/fixtures/sample_contract.pdf'));
    await page.getByRole('button', { name: /Document samjhein/i }).click();
    await expect(page.getByText('Delivery partner agreement.', { exact: true })).toBeVisible();

    const question = page.locator('#doc-question-input');
    await question.fill('Order cancel karne par kitna katega?');
    await question.press('Enter');
    await expect(page.getByText('Pickup ke baad cancel karne par Rs. 50 katega.')).toBeVisible();
    await expect(page.getByText('a fee of Rs. 50 will be deducted from the partner payout')).toBeVisible();
    await expect(page.getByText('Page 1')).toBeVisible();
    expect(askBody.documentId).toBe('doc_00000000-0000-4000-8000-000000000001');

    await question.fill('Kya health insurance milega?');
    await question.press('Enter');
    await expect(page.getByText('Document mein nahi mila')).toBeVisible();
  });
});
