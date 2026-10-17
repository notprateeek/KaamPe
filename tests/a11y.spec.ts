import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('KaamPe Accessibility Audits (WCAG 2.2 AA)', () => {
  async function runAxeAudit(page: any, contextName: string) {
    const axePath = path.resolve('node_modules/axe-core/axe.min.js');
    await page.addScriptTag({ path: axePath });

    const results = await page.evaluate(async () => {
      // @ts-ignore
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
    const hindiBtn = page.getByRole('button', { name: /हिन्दी/i });
    if (await hindiBtn.isVisible()) {
      await hindiBtn.click();
      await page.getByRole('button', { name: /Delivery/i }).click();
      await page.getByRole('button', { name: /Aage badhein/i }).click();
      await expect(page.getByText('Namaste 👋')).toBeVisible();
    }
  }

  test('Screen 1: Onboarding has 0 serious/critical axe violations', async ({ page }) => {
    await page.goto('/');
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
});
