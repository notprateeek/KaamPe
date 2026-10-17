import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

/** Browser checks for the safety coach, money insights and chat-history restore (AI responses mocked). */

async function completeOnboarding(page: Page) {
  await page.goto('/');
  // Login gate (first visit): continue as a guest, which leads to onboarding.
  const guestBtn = page.getByRole('button', { name: /Bina account ke aage badhein/i });
  await expect(guestBtn.or(page.getByText('Namaste 👋'))).toBeVisible({ timeout: 10000 });
  if (await guestBtn.isVisible()) {
    await guestBtn.click();
    await page.getByRole('button', { name: /हिन्दी/i }).waitFor();
  }
  const hindiBtn = page.getByRole('button', { name: /हिन्दी/i });
  if (await hindiBtn.isVisible()) {
    await hindiBtn.click();
    await page.getByRole('button', { name: /Delivery/i }).click();
    await page.getByRole('button', { name: /Aage badhein/i }).click();
    await expect(page.getByText('Namaste 👋')).toBeVisible();
  }
}

async function expectNoSeriousAxeViolations(page: Page) {
  await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => {
    // @ts-expect-error axe is injected into the page at runtime
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    return r.violations.filter((v: { impact: string }) => v.impact === 'critical' || v.impact === 'serious');
  });
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

test.describe('Ported features', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('Help → Suraksha: chip fills the situation, checklist and trusted helplines appear', async ({ page }) => {
    await page.route('**/api/ai/safety', (route) =>
      route.fulfill({
        json: {
          type: 'answer',
          intent: 'safety',
          directAnswer: 'Roshni wali jagah par ruk jaayein.',
          steps: ['Hazard light on karein.', 'Chot ho to **112** par call karein.'],
          helplines: [
            { id: 'emergency', label: 'Emergency', number: '112' },
            { id: 'highway', label: 'National highway emergency (NHAI)', number: '1033' },
          ],
        },
      })
    );
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Help' }).first().click();
    await page.getByRole('tab', { name: 'Suraksha' }).click();

    const chip = page.getByRole('button', { name: 'Raat ko akele kaam' });
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Kya ho raha hai?')).toHaveValue('Raat ko akele kaam');

    await page.getByRole('button', { name: 'Suraksha steps paayein' }).click();
    await expect(page.getByText('Roshni wali jagah par ruk jaayein.')).toBeVisible();
    await expect(page.locator('strong', { hasText: '112' })).toBeVisible();
    await expect(page.locator('a[href="tel:1033"]')).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test('Money → AI insights shows summary and tips', async ({ page }) => {
    await page.route('**/api/ai/money-insights', (route) =>
      route.fulfill({ json: { summary: 'Aapne ₹800 bachaye.', tips: ['Fuel sabse bada kharch hai.'], usedFallback: false } })
    );
    await completeOnboarding(page);
    await page.request.post('/api/money/earning', { data: { amount: 1000, source: 'Swiggy' } });
    await page.getByRole('button', { name: 'Money' }).first().click();
    const get = page.getByRole('button', { name: 'Salah paayein' });
    await expect(get).toBeEnabled();
    await get.click();
    await expect(page.getByText('Aapne ₹800 bachaye.')).toBeVisible();
    await expect(page.getByText('Fuel sabse bada kharch hai.')).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test('saved chat comes back after a reload', async ({ page }) => {
    await page.route('**/api/ai/history', (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            json: {
              messages: [
                { id: 'm1', role: 'user', content: 'e-Shram kya hai?', createdAt: 1 },
                {
                  id: 'm2',
                  role: 'assistant',
                  content: 'Free registration.',
                  createdAt: 2,
                  data: { type: 'answer', directAnswer: 'e-Shram ek free registration hai.', steps: ['eshram.gov.in par jaayein.'] },
                },
              ],
            },
          })
        : route.continue()
    );
    await completeOnboarding(page);
    await page.reload();
    await expect(page.getByText('e-Shram kya hai?')).toBeVisible();
    await expect(page.getByText('e-Shram ek free registration hai.')).toBeVisible();
  });

  test('chat answer streams in, and Stop cancels a reply', async ({ page }) => {
    const ndjson = (...events: object[]) => events.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await page.route('**/api/ai/chat', (route) =>
      route.fulfill({
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: ndjson(
          { event: 'partial', directAnswer: 'Chhaon mein' },
          { event: 'done', body: { type: 'answer', directAnswer: 'Chhaon mein aaram karein.', steps: ['Paani peete rahein.'] } }
        ),
      })
    );
    await completeOnboarding(page);
    await page.getByPlaceholder(/Kaam, paise, rights/i).fill('Garmi mein kya karein?');
    await page.getByRole('button', { name: 'Poochhein', exact: true }).click();
    await expect(page.getByText('Chhaon mein aaram karein.')).toBeVisible();
    await expect(page.getByText('Paani peete rahein.')).toBeVisible();

    // A reply that never finishes can be stopped; no error bubble appears.
    await page.unroute('**/api/ai/chat');
    await page.route('**/api/ai/chat', () => new Promise(() => {}));
    await page.getByPlaceholder(/Kaam, paise, rights/i).fill('Ek aur sawaal');
    await page.getByRole('button', { name: 'Poochhein', exact: true }).click();
    const stop = page.getByRole('button', { name: 'Rokein' });
    await expect(stop).toBeVisible();
    await stop.click();
    await expect(page.getByRole('button', { name: 'Poochhein', exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
