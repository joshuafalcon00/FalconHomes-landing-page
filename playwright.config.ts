import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Falcon Homes site.
 *
 * `import 'dotenv/config'` (above) loads the project .env so tests can read
 * process.env.SUPABASE_URL and process.env.SUPABASE_ANON_KEY.
 */
export default defineConfig({
  testDir: './tests',
  // Run tests in files in parallel.
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source.
  forbidOnly: !!process.env.CI,
  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,
  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: 'html',
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    // Collect trace when retrying the failed test.
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
