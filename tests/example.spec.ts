import { test, expect } from '@playwright/test';

/**
 * Smoke test confirming Playwright is wired up and the .env values
 * (loaded via `import 'dotenv/config'` in playwright.config.ts) are visible.
 */
test('env vars are loaded from .env', async () => {
  expect(process.env.SUPABASE_URL, 'SUPABASE_URL should be set in .env').toBeTruthy();
  expect(process.env.SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY should be set in .env').toBeTruthy();
});
