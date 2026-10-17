import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Captures README screenshots into docs/screenshots (mobile 390px and desktop 1280px).
 * Skipped unless SCREENSHOTS=1:  SCREENSHOTS=1 npx playwright test tests/screenshots.spec.ts
 */
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/screenshots');

test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to capture README screenshots');

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 860 },
] as const;

async function onboarded(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kaampe_onboarded', 'true');
    localStorage.setItem(
      'kaampe_profile',
      JSON.stringify({ language: 'en', workerType: 'delivery', state: 'Punjab', isOnboarded: true })
    );
  });
}

async function seedMoney(page: Page) {
  const today = new Date();
  const iso = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    await page.request.post('/api/money/earning', { data: { amount: 700 + i * 90, source: i % 2 ? 'Zomato' : 'Swiggy', date: iso(d) } });
    await page.request.post('/api/money/expense', { data: { amount: 120 + i * 10, category: 'Fuel', date: iso(d) } });
  }
}

const tab = (page: Page, name: RegExp) => page.getByRole('button', { name }).first();

for (const vp of VIEWPORTS) {
  test(`screenshots (${vp.name})`, async ({ page, context }) => {
    test.setTimeout(60000);
    await context.clearCookies();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await onboarded(page);
    await page.goto('/');
    await seedMoney(page);
    await page.reload();

    await expect(page.locator('#main-content')).toBeVisible();
    await page.screenshot({ path: `${OUT}/home-${vp.name}.png` });

    await tab(page, /^Money/).click();
    await expect(page.getByText(/AI money insights/)).toBeVisible();
    await page.screenshot({ path: `${OUT}/money-${vp.name}.png`, fullPage: vp.name === 'desktop' });

    await tab(page, /^Help/).click();
    await expect(page.getByRole('tablist')).toBeVisible();
    await page.screenshot({ path: `${OUT}/help-${vp.name}.png` });

    const safety = page.getByRole('tab', { name: /Safety/ });
    if (await safety.count()) {
      await safety.click();
      await page.screenshot({ path: `${OUT}/safety-${vp.name}.png` });
    }
  });
}
