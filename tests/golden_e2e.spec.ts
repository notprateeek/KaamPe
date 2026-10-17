import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('KaamPe Golden E2E Journey (Section 45)', () => {
  test('Complete Golden User Flow: Onboarding -> Money Tracker -> AI Ask Money -> AI Action Confirmation -> Grounded Schemes -> Document -> Dispute', async ({
    page,
    context,
  }) => {
    test.setTimeout(180000); // This journey makes several sequential live Gemini calls.
    // Clear storage and cookies for clean context
    await context.clearCookies();
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // ----------------------------------------------------
    // STEP 1: ONBOARDING
    // ----------------------------------------------------
    await page.goto('/');
    // Login gate (first visit): continue as a guest, which leads to onboarding.
    const guestBtn = page.getByRole('button', { name: /Bina account ke aage badhein/i });
    await expect(guestBtn.or(page.getByText('Namaste 👋'))).toBeVisible({ timeout: 10000 });
    if (await guestBtn.isVisible()) {
      await guestBtn.click();
      await page.getByRole('button', { name: /हिन्दी/i }).waitFor();
    }

    // Choose Hindi
    const hindiBtn = page.getByRole('button', { name: /हिन्दी/i });
    await expect(hindiBtn).toBeVisible({ timeout: 10000 });
    await hindiBtn.click();

    // Choose Delivery
    const deliveryBtn = page.getByRole('button', { name: /Delivery/i });
    await expect(deliveryBtn).toBeVisible();
    await deliveryBtn.click();

    // Choose Punjab State & Continue
    const stateSelect = page.locator('#state-select');
    await expect(stateSelect).toBeVisible();
    await stateSelect.selectOption('Punjab');

    const continueBtn = page.getByRole('button', { name: /Aage badhein/i });
    await continueBtn.click();

    // Confirm Home appears correctly
    await expect(page.getByText('Namaste 👋')).toBeVisible();
    await expect(page.getByText('Aaj kis cheez mein help chahiye?')).toBeVisible();

    // ----------------------------------------------------
    // STEP 2: MONEY TRACKER
    // ----------------------------------------------------
    // Navigate to Money tab
    await page.getByRole('button', { name: 'Money' }).click();

    // Add Earning ₹850
    await page.getByRole('button', { name: '+ Kamai' }).first().click();
    await page.getByLabel(/Rupaye/i).fill('850');
    await page.getByPlaceholder(/Swiggy/i).fill('Swiggy');
    await page.getByRole('button', { name: 'Save karein' }).click();

    // Add Expense ₹200 Fuel
    await page.getByRole('button', { name: '− Kharcha', exact: true }).click();
    await page.getByLabel(/Rupaye/i).fill('200');
    await page.locator('#expense-category-select').selectOption('Fuel');
    await page.getByRole('button', { name: 'Save karein' }).click();

    // Verify Net today is ₹650
    await expect(page.getByText('₹650', { exact: true })).toBeVisible();

    // Refresh page and confirm ₹650 remains
    await page.reload();
    await expect(page.getByText('₹650', { exact: true })).toBeVisible();

    // ----------------------------------------------------
    // STEP 3: ASK KAAMPE: "Aaj kitna bacha?"
    // ----------------------------------------------------
    await page.getByRole('button', { name: 'Home' }).click();
    const chatInput = page.getByPlaceholder(/Kaam, paise, rights/i);
    await chatInput.fill('Aaj kitna bacha?');
    await page.getByRole('button', { name: 'Poochhein' }).click();

    // Assistant response must be based on ₹650
    await expect(page.getByText(/₹650/)).toBeVisible({ timeout: 15000 });

    // ----------------------------------------------------
    // STEP 4: AI ACTION CONFIRMATION: "Swiggy se 500 aur kamaye."
    // ----------------------------------------------------
    await chatInput.fill('Swiggy se 500 aur kamaye.');
    await page.getByRole('button', { name: 'Poochhein' }).click();

    // Confirmation card should appear with + ₹500
    await expect(page.getByText(/Add to today's money\?/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('+ ₹500')).toBeVisible();

    // Click Save on confirmation card
    const saveCardBtn = page.getByRole('button', { name: 'Save' });
    await saveCardBtn.click();

    // Confirm today's net updates to ₹1,150 (850 - 200 + 500 = 1150)
    await expect(page.getByText('₹1,150', { exact: true })).toBeVisible({ timeout: 10000 });

    // ----------------------------------------------------
    // STEP 5: GROUNDED SCHEME QUESTION: Punjab construction workers
    // ----------------------------------------------------
    await chatInput.fill('Punjab mein construction workers ke liye koi government scheme hai?');
    const schemeResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith('/api/ai/chat') && response.request().method() === 'POST',
      { timeout: 90000 }
    );
    await page.getByRole('button', { name: 'Poochhein' }).click();
    const schemeResponse = await schemeResponsePromise;
    expect(schemeResponse.ok()).toBe(true);
    // The chat streams NDJSON events; the last one ("done") carries the full answer.
    const events = (await schemeResponse.text()).trim().split('\n').map((line) => JSON.parse(line));
    const scheme = events.at(-1).body;
    expect(scheme.intent).toBe('scheme');
    expect(scheme.sources.length).toBeGreaterThan(0);
    for (const source of scheme.sources) {
      const host = new URL(source.url).hostname;
      expect(host.endsWith('.gov.in') || host === 'vertexaisearch.cloud.google.com').toBe(true);
    }
    if (scheme.eligibilityState === 'Unable to verify') {
      console.warn('Live grounding unavailable: verifying the honest uncertainty response and official portal links.');
      await expect(page.getByText(scheme.directAnswer, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: scheme.sources[0].title, exact: true })).toBeVisible();

    // ----------------------------------------------------
    // STEP 6: EXPLAIN A DOCUMENT
    // ----------------------------------------------------
    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByRole('tab', { name: /Document samjhein/i }).click();

    const fileInput = page.locator('#doc-file-input');
    const samplePdfPath = path.resolve(__dirname, './fixtures/sample_contract.pdf');
    await fileInput.setInputFiles(samplePdfPath);

    const analyzeBtn = page.getByRole('button', { name: /Document samjhein/i });
    const documentResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith('/api/document/explain'), { timeout: 60000 }
    );
    await analyzeBtn.click();
    const documentResponse = await documentResponsePromise;
    expect(documentResponse.status()).toBe(200);
    const document = await documentResponse.json();
    expect(document.success).toBe(true);
    expect(document.explanation.readable).toBe(true);
    await expect(page.getByText(document.explanation.whatIsThis, { exact: true })).toBeVisible();

    // ----------------------------------------------------
    // STEP 7: DISPUTE FLOW
    // ----------------------------------------------------
    await page.getByRole('tab', { name: /Payment dispute help/i }).click();
    const disputeTextarea = page.getByPlaceholder(/Swiggy ka ₹3200/i);
    await disputeTextarea.fill('Meri ₹3200 payment 8 din se pending hai.');

    await page.getByRole('button', { name: /Draft banayein/i }).click();

    // Verify draft appears with exact user-supplied facts (₹3200 and 8 din)
    await expect(page.getByText(/Draft message/i)).toBeVisible({ timeout: 60000 });
    const draftText = page.locator('textarea').last();
    await expect(draftText).toHaveValue(/3,?200/);
    await expect(draftText).toHaveValue(/8/);
    expect(await draftText.inputValue()).not.toMatch(/Swiggy|Zomato|Uber|Porter/i);

    // Test Copy button
    const copyBtn = page.getByRole('button', { name: /Copy karein/i });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(page.getByText(/Copy ho gaya!/i)).toBeVisible();
  });
});
