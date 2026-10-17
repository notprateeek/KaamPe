import { test, expect, type Page } from '@playwright/test';

/**
 * Voice input UI. The browser's speech recognition is replaced with a fake, and
 * Gemini transcription responses are MOCKED with page.route (no live call); the
 * chat request after the worker submits goes to the real server.
 */

/** Removes the browser's speech recognition so the Gemini recorder path is used. */
async function forceRecorderPath(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  });
}

/** Installs a fake SpeechRecognition that either hears `transcript` or fails with `error`. */
async function fakeBrowserSpeech(page: Page, behaviour: { transcript?: string; error?: string }) {
  await page.addInitScript((b) => {
    class FakeRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        (window as unknown as { __speechLang: string }).__speechLang = this.lang;
        setTimeout(() => {
          if (b.error) {
            this.onerror?.({ error: b.error });
          } else {
            const words = (b.transcript ?? '').split(' ');
            const half = words.slice(0, Math.ceil(words.length / 2)).join(' ');
            const interim = [{ transcript: half }];
            this.onresult?.({ resultIndex: 0, results: { length: 1, 0: Object.assign(interim, { isFinal: false }) } });
            const final = [{ transcript: b.transcript }];
            this.onresult?.({ resultIndex: 0, results: { length: 1, 0: Object.assign(final, { isFinal: true }) } });
          }
          this.onend?.();
        }, 300);
      }
      stop() {}
      abort() {}
    }
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
  }, behaviour);
}

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

// Chromium's fake microphone, so recording works headless.
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
});

test.describe('Voice input', () => {
  test('uses the browser speech recognition first, free and without calling Gemini', async ({ page }) => {
    let transcribeCalls = 0;
    await page.route('**/api/ai/transcribe', (route) => {
      transcribeCalls++;
      return route.fulfill({ json: { success: true, transcript: 'should not be used' } });
    });
    await fakeBrowserSpeech(page, { transcript: 'Aaj Zomato se 700 kamaye' });
    await completeOnboarding(page);

    await page.locator('#home-chat-input').fill('Note:');
    await page.getByRole('button', { name: 'Bolkar likhein (mic)' }).first().click();
    await expect(page.locator('#home-chat-input')).toHaveValue('Note: Aaj Zomato se 700 kamaye');
    expect(await page.evaluate(() => (window as unknown as { __speechLang: string }).__speechLang)).toBe('hi-IN');
    expect(transcribeCalls).toBe(0);
  });

  test('falls back to Gemini transcription when the browser speech service fails (mocked)', async ({ page }) => {
    let transcribeCalls = 0;
    await page.route('**/api/ai/transcribe', (route) => {
      transcribeCalls++;
      return route.fulfill({ json: { success: true, transcript: 'Petrol pe 200 kharch' } });
    });
    await fakeBrowserSpeech(page, { error: 'network' });
    await completeOnboarding(page);

    const mic = page.getByRole('button', { name: 'Bolkar likhein (mic)' }).first();
    await mic.click();
    // The recorder takes over automatically (after the speech error); the worker taps again to stop.
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(2500);
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    await mic.click();
    await expect(page.locator('#home-chat-input')).toHaveValue('Petrol pe 200 kharch', { timeout: 15000 });
    expect(transcribeCalls).toBe(1);
  });

  test('records, shows an editable transcript, and never sends or saves it automatically (mocked transcription)', async ({ page }) => {
    await forceRecorderPath(page);
    let transcribeCalls = 0;
    const chatCalls: string[] = [];
    await page.route('**/api/ai/transcribe', async (route) => {
      transcribeCalls++;
      await route.fulfill({ json: { success: true, transcript: 'Aaj Swiggy se 850 kamaye' } });
    });
    page.on('request', (req) => {
      if (req.url().includes('/api/ai/chat') || req.url().includes('/api/ai/confirm-money')) chatCalls.push(req.url());
    });

    await completeOnboarding(page);
    const mic = page.getByRole('button', { name: 'Bolkar likhein (mic)' }).first();
    await mic.click();
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(1500);
    await mic.click();

    const input = page.locator('#home-chat-input');
    await expect(input).toHaveValue('Aaj Swiggy se 850 kamaye', { timeout: 15000 });
    expect(transcribeCalls).toBe(1);
    expect(chatCalls).toEqual([]);

    // Worker edits and submits explicitly; the result is only a confirmation card.
    await input.fill('Aaj Swiggy se 900 kamaye');
    await page.getByRole('button', { name: 'Poochhein' }).click();
    await expect(page.getByText('+ ₹900')).toBeVisible({ timeout: 30000 });
    expect(chatCalls.filter((u) => u.includes('confirm-money'))).toEqual([]);
  });

  test('explains a denied microphone and keeps typing available', async ({ page }) => {
    await forceRecorderPath(page);
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
    });
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Bolkar likhein (mic)' }).first().click();
    await expect(page.getByRole('alert').filter({ hasText: /permission/i })).toBeVisible();
    await page.locator('#home-chat-input').fill('Typing still works');
    await expect(page.locator('#home-chat-input')).toHaveValue('Typing still works');
  });

  test('explains when the browser has neither speech recognition nor recording', async ({ page }) => {
    await forceRecorderPath(page);
    await page.addInitScript(() => {
      // @ts-expect-error simulate an old browser
      delete window.MediaRecorder;
    });
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Bolkar likhein (mic)' }).first().click();
    await expect(page.getByRole('alert').filter({ hasText: /browser mein awaaz record nahi/i })).toBeVisible();
  });

  test('shows the server message when transcription fails (mocked quota error)', async ({ page }) => {
    await forceRecorderPath(page);
    await page.route('**/api/ai/transcribe', (route) =>
      route.fulfill({
        status: 503,
        json: { error: 'Bolkar likhna abhi uplabdh nahi hai (AI vyast hai). Kripya type karke likhein.', code: 'ai_unavailable' },
      })
    );
    await completeOnboarding(page);
    const mic = page.getByRole('button', { name: 'Bolkar likhein (mic)' }).first();
    await mic.click();
    await page.waitForTimeout(1200);
    await mic.click();
    await expect(page.getByRole('alert').filter({ hasText: /AI vyast hai/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#home-chat-input')).toHaveValue('');
  });
});
