import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('KaamPe Accessibility Audits (WCAG 2.2 AA)', () => {
  async function runAxeAudit(page: any, contextName: string) {
    const axePath = path.resolve('node_modules/axe-core/axe.min.js');
    await page.addScriptTag({ path: axePath });

    const results = await page.evaluate(async () => {
      // @ts-expect-error axe is injected into the page at runtime
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
        },
      });
    });

    const criticalOrSerious = results.violations.filter(
      (v: any) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalOrSerious.length > 0) {
      console.error(`Axe violations in ${contextName}:`, JSON.stringify(criticalOrSerious, null, 2));
    }

    expect(
      criticalOrSerious.length,
      `Found ${criticalOrSerious.length} critical/serious a11y violations in ${contextName}`
    ).toBe(0);
  }

  async function completeOnboarding(page: any) {
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

  test('Screen 0: Sign-in has 0 serious/critical axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Bina account ke aage badhein/i })).toBeVisible();
    await runAxeAudit(page, 'Sign-in');
  });

  test('Screen 1: Onboarding has 0 serious/critical axe violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Bina account ke aage badhein/i }).click();
    await expect(page.getByText('Bhasha chunein')).toBeVisible();
    await runAxeAudit(page, 'Onboarding');
  });

  test('Screen 2: Home has 0 serious/critical axe violations', async ({ page }) => {
    await completeOnboarding(page);
    await runAxeAudit(page, 'Home View');
  });

  test('Screen 3: Money Tracker has 0 serious/critical axe violations', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Money' }).click();
    await expect(page.getByText(/Bacha aaj|Net today/i)).toBeVisible();
    await runAxeAudit(page, 'Money View');
  });

  test('Screen 4: Help has 0 serious/critical axe violations', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Help' }).click();
    await expect(page.getByText(/Help Center/i)).toBeVisible();
    await runAxeAudit(page, 'Help View');
  });

  test('Screen 5: You (profile & settings) has 0 serious/critical axe violations', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Aap', exact: true }).click();
    await expect(page.getByText('Aapki profile')).toBeVisible();
    await runAxeAudit(page, 'You View');
  });

  test('Dark theme: Home and You have 0 serious/critical axe violations', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await completeOnboarding(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await runAxeAudit(page, 'Home View (dark)');
    await page.getByRole('button', { name: 'Aap', exact: true }).click();
    await expect(page.getByText('Aapki profile')).toBeVisible();
    await runAxeAudit(page, 'You View (dark)');
  });

  test('Demo account: Home and Money with data have 0 serious/critical axe violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Demo dekhein/i }).click();
    await expect(page.getByText('Namaste 👋')).toBeVisible();
    await runAxeAudit(page, 'Home View (demo data)');
    await page.getByRole('button', { name: 'Money' }).click();
    await expect(page.getByText(/Bacha aaj|Net today/i)).toBeVisible();
    await runAxeAudit(page, 'Money View (demo data)');
  });

  test('Admin panel sign-in has 0 serious/critical axe violations', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Admin login/i })).toBeVisible();
    await runAxeAudit(page, 'Admin login');
  });
});
