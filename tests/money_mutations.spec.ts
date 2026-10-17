import { test, expect, type Page } from '@playwright/test';

/**
 * Money micro-features: Undo after saving, and daily-goal progress on Home.
 * No AI calls; everything runs against the real server and a fresh session.
 */

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

async function entryCount(page: Page): Promise<number> {
  const res = await page.request.get('/api/money/entries');
  expect(res.ok()).toBeTruthy();
  return (await res.json()).entries.length;
}

test.describe('Money: Undo and daily goal', () => {
  test('Money tab: Undo on the "saved" toast deletes the entry', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Money' }).click();
    await page.getByRole('button', { name: '+ Kamai', exact: true }).first().click();
    await page.locator('#money-amount').fill('850');
    await page.getByRole('button', { name: 'Save karein', exact: true }).click();

    await expect(page.getByText('₹850 kamai save hui')).toBeVisible();
    expect(await entryCount(page)).toBe(1);

    await page.getByRole('button', { name: 'Wapas lein' }).click();
    await expect(page.getByText('Entry hata di')).toBeVisible();
    await expect.poll(() => entryCount(page)).toBe(0);
  });

  test('Home: goal progress uses today\'s earnings, and Undo from the quick-add modal works', async ({ page }) => {
    await completeOnboarding(page);

    await page.getByRole('button', { name: 'Aap', exact: true }).click();
    await page.locator('#me-goal').fill('1000');
    await page.getByRole('button', { name: 'Target rakhein' }).click();
    await expect(page.getByText('Target save ho gaya')).toBeVisible();

    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: '+ Kamai add karein', exact: true }).click();
    await page.locator('#quick-earning-amount').fill('850');
    await page.getByRole('button', { name: 'Save karein', exact: true }).click();
    await expect(page.getByText('₹850 kamai save hui')).toBeVisible();

    // ₹850 of a ₹1,000 goal: 85%, ₹150 left.
    const progress = page.getByRole('progressbar', { name: 'Roz ka target' });
    await expect(progress).toHaveAttribute('aria-valuenow', '85');
    await expect(page.getByText('₹1,000 ke target mein se ₹150 baaki')).toBeVisible();

    await page.getByRole('button', { name: 'Wapas lein' }).click();
    await expect(page.getByText('Entry hata di')).toBeVisible();
    await expect.poll(() => entryCount(page)).toBe(0);
    await expect(progress).toHaveAttribute('aria-valuenow', '0');
  });
});
