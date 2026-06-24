import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * End-to-end test for the "Send us a message" contact form on index.html.
 *
 * Flow:
 *   1. Open the live site (process.env.SITE_URL, defaulting to the deployed URL).
 *   2. Scroll to the contact form.
 *   3. Fill it with a unique (timestamped) email so re-runs never collide with
 *      the server's per-email daily spam cap.
 *   4. Submit and confirm the success toast appears within 5 seconds.
 *   5. SEPARATELY, query Supabase directly to confirm the row was really written.
 *
 * The Supabase check lives in its own test.step so that if the browser-side
 * submission succeeds but the database write didn't, the failure points at the
 * "Verify row in Supabase" step rather than the form step.
 */

const SITE_URL = process.env.SITE_URL || 'https://falconhomes-landing-page.vercel.app';

// Every run inserts a real row (and fires a real Resend email). Without cleanup
// the table fills with test data. This teardown deletes ALL test rows (this run
// plus any left over from earlier runs), matching the `playwright-test+` prefix.
//
// CAVEAT: this works only while RLS is DISABLED on `messages`, which it is today.
// If RLS is re-enabled with an INSERT-only policy (security rule #3), an anon-key
// DELETE succeeds with 0 rows removed and NO error. The check below logs the
// deleted count and warns loudly on 0, so that silent no-op can't go unnoticed.
// In that case, switch to a service-role key here, or just filter
// `email LIKE 'playwright-test+%'` out of the admin dashboard instead.
test.afterAll(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('[form-e2e] Skipping teardown: SUPABASE_URL / SUPABASE_ANON_KEY not set.');
    return;
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('messages')
    .delete()
    .like('email', 'playwright-test+%')
    .select('email');
  if (error) {
    console.warn(`[form-e2e] Teardown delete failed: ${error.message}`);
    return;
  }
  const removed = data?.length ?? 0;
  if (removed === 0) {
    console.warn(
      '[form-e2e] Teardown removed 0 rows. If a test row was just inserted, RLS is ' +
        'likely blocking anon DELETE — use a service-role key or filter in the dashboard.',
    );
  } else {
    console.log(`[form-e2e] Teardown removed ${removed} test row(s) from "messages".`);
  }
});

test('contact form submits and persists to Supabase', async ({ page }) => {
  // A fresh timestamp per run keeps the email unique (avoids duplicate sends /
  // the 5-per-email-per-day spam guard). The server lowercases the email, and
  // this one is already lowercase, so the later DB lookup matches exactly.
  const timestamp = Date.now();
  const testName = 'Playwright Test User';
  const testEmail = `playwright-test+${timestamp}@example.com`;
  const testMessage = 'This is an automated test submission';

  console.log(`\n[form-e2e] Target site : ${SITE_URL}`);
  console.log(`[form-e2e] Test email : ${testEmail}\n`);

  await test.step('Open the live site', async () => {
    // domcontentloaded (not "load") so we don't wait on the fixed hero video.
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Falcon Homes/i);
  });

  await test.step('Scroll to the contact form', async () => {
    await page.locator('#get-in-touch').scrollIntoViewIfNeeded();
    await expect(page.locator('#contactForm')).toBeVisible();
  });

  await test.step('Fill and submit the form', async () => {
    await page.fill('#cfName', testName);
    await page.fill('#cfEmail', testEmail);
    await page.fill('#cfMessage', testMessage);
    await page.click('#contactForm button[type="submit"]');
  });

  await test.step('Verify the success message appears within 5 seconds', async () => {
    const toast = page.locator('#cfToast');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText('Message sent', { timeout: 5000 });
    // On failure the toast gets an "error" class instead. Make sure it's a success.
    await expect(toast).not.toHaveClass(/error/);
    console.log('[form-e2e] ✓ Browser saw the success toast.');
  });

  await test.step('Verify the row was created in Supabase', async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    expect(url, 'SUPABASE_URL must be set in .env').toBeTruthy();
    expect(key, 'SUPABASE_ANON_KEY must be set in .env').toBeTruthy();

    const supabase = createClient(url as string, key as string);

    // The insert completes before the API responds, so the row should already
    // exist. Poll briefly anyway to absorb any read-replica lag.
    let row: { name?: string; email?: string; message?: string } | undefined;
    await expect
      .poll(
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .select('name, email, message, created_at')
            .eq('email', testEmail)
            .order('created_at', { ascending: false })
            .limit(1);
          if (error) throw new Error(`Supabase query failed: ${error.message}`);
          row = data?.[0];
          return data?.length ?? 0;
        },
        { timeout: 10000, message: `No row found in "messages" for ${testEmail}` },
      )
      .toBe(1);

    expect(row?.name).toBe(testName);
    expect(row?.message).toBe(testMessage);
    console.log(`[form-e2e] ✓ Row confirmed in Supabase "messages" table for ${testEmail}.`);
  });
});
