import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Browser QA sweep for the live Falcon Homes site.
 *
 *   1. Open the live site and screenshot the landing page.
 *   2. Collect every link in the nav and footer.
 *   3. Follow only INTERNAL links (same host). Skip social / external links
 *      (LinkedIn, Facebook, etc.), mailto:/tel:, and pure same-page #anchors.
 *   4. For each internal page: assert HTTP 200, no obvious error text, presence
 *      of nav + footer, and screenshot it. Then return home.
 *   5. Confirm the contact form blocks an empty submission (required-field
 *      validation) in a separate test.
 *   6. Write a markdown report (one row per page) to tests/browser-qa-report.md.
 */

const SITE_URL = process.env.SITE_URL || 'https://falconhomes-landing-page.vercel.app';

const SCREENSHOT_DIR = path.join(process.cwd(), 'tests', 'screenshots');
const REPORT_PATH = path.join(process.cwd(), 'tests', 'qa-report.md');

// Substrings that signal a broken page even if the status looked OK.
const ERROR_MARKERS = [
  '404',
  'not found',
  'page could not be found',
  'application error',
  'this page could not be found',
  'something went wrong',
  'internal server error',
];

type PageRecord = {
  name: string;
  url: string;
  status: number | string;
  hasNav: boolean;
  hasFooter: boolean;
  screenshot: string;
};

// Turn a link/url into a short, filesystem-safe screenshot slug.
function slugFor(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.replace(/\/$/, '').split('/').pop() || 'home';
    const base = last.replace(/\.html?$/i, '') || 'home';
    return base.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  } catch {
    return 'page';
  }
}

test('landing page loads and all internal nav/footer links work', async ({ page }) => {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  const records: PageRecord[] = [];
  const errors: string[] = [];

  const siteHost = new URL(SITE_URL).host;

  // ---- 1. Landing page ----
  const landingResp = await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
  const landingShot = path.join(SCREENSHOT_DIR, 'landing.png');
  await page.screenshot({ path: landingShot, fullPage: true });
  records.push({
    name: 'Landing',
    url: SITE_URL,
    status: landingResp?.status() ?? 'no response',
    hasNav: (await page.locator('header.site').count()) > 0,
    hasFooter: (await page.locator('footer').count()) > 0,
    screenshot: path.relative(process.cwd(), landingShot),
  });
  expect(landingResp?.status(), 'landing page should return 200').toBe(200);

  // ---- 2. Collect nav + footer links ----
  const rawLinks = await page
    .locator('header.site a[href], footer a[href]')
    .evaluateAll((els) =>
      els.map((el) => ({
        href: (el as HTMLAnchorElement).href, // absolute, resolved by the browser
        text: (el.textContent || '').trim(),
      })),
    );

  // ---- 3. Keep only internal page links (dedup by pathname) ----
  const seen = new Set<string>();
  const internal: { href: string; text: string }[] = [];
  for (const link of rawLinks) {
    let u: URL;
    try {
      u = new URL(link.href);
    } catch {
      continue;
    }
    if (u.protocol === 'mailto:' || u.protocol === 'tel:') continue; // not pages
    if (u.host !== siteHost) continue; // external / social: skip
    // Pure same-page anchor (e.g. #home, #listings): no new page to load.
    if (u.pathname === new URL(SITE_URL).pathname && u.hash) continue;
    const keyPath = u.pathname.replace(/\/$/, '') || '/';
    if (seen.has(keyPath)) continue;
    seen.add(keyPath);
    internal.push({ href: u.origin + u.pathname, text: link.text });
  }
  console.log(`[browser-qa] Found ${internal.length} internal page link(s): ` +
    internal.map((l) => l.href).join(', '));

  // ---- 4. Visit each internal page ----
  for (const link of internal) {
    const resp = await page.goto(link.href, { waitUntil: 'domcontentloaded' });
    const status = resp?.status() ?? 'no response';
    const slug = slugFor(link.href);
    const shot = path.join(SCREENSHOT_DIR, `${slug}.png`);
    await page.screenshot({ path: shot, fullPage: true });

    const hasNav = (await page.locator('header.site').count()) > 0;
    const hasFooter = (await page.locator('footer').count()) > 0;

    // Check for obvious error text in the visible body. Use innerText (not
    // textContent) so we only see RENDERED text, not the source of inline
    // <script> tags or hidden error-message placeholders.
    const bodyText = ((await page.locator('body').innerText()) || '').toLowerCase();
    const hitMarker = ERROR_MARKERS.find((m) => bodyText.includes(m));

    records.push({
      name: link.text || slug,
      url: link.href,
      status,
      hasNav,
      hasFooter,
      screenshot: path.relative(process.cwd(), shot),
    });

    if (status !== 200) errors.push(`${link.href} returned status ${status}`);
    if (hitMarker) errors.push(`${link.href} shows error text: "${hitMarker}"`);
    if (!hasNav) errors.push(`${link.href} is missing the nav/header`);
    if (!hasFooter) errors.push(`${link.href} is missing the footer`);
  }

  // ---- 5. Return to the home page ----
  await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/Falcon Homes/i);

  // ---- 6. Write the markdown report ----
  const rows = records
    .map(
      (r) =>
        `| ${r.name} | ${r.url} | ${r.status} | ${r.hasNav ? '✅' : '❌'} | ` +
        `${r.hasFooter ? '✅' : '❌'} | \`${r.screenshot}\` |`,
    )
    .join('\n');
  const report =
    `# Browser QA Report\n\n` +
    `- **Site:** ${SITE_URL}\n` +
    `- **Pages checked:** ${records.length}\n` +
    `- **Issues found:** ${errors.length}\n\n` +
    `| Page name | URL | Status | Has nav | Has footer | Screenshot path |\n` +
    `| --- | --- | --- | --- | --- | --- |\n` +
    `${rows}\n` +
    (errors.length ? `\n## Issues\n\n${errors.map((e) => `- ${e}`).join('\n')}\n` : '\n_No issues found._\n');

  await fs.writeFile(REPORT_PATH, report, 'utf8');
  console.log(`\n[browser-qa] Report written to ${path.relative(process.cwd(), REPORT_PATH)}\n`);
  console.log(report);

  // Fail the test if any page had a problem, after the report is saved.
  expect(errors, `QA issues:\n${errors.join('\n')}`).toEqual([]);
});

test('contact form blocks an empty submission (required-field validation)', async ({ page }) => {
  await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#get-in-touch').scrollIntoViewIfNeeded();

  // With required Name + Email empty, the form is invalid before any network call.
  const formValid = await page
    .locator('#contactForm')
    .evaluate((f) => (f as HTMLFormElement).checkValidity());
  expect(formValid, 'empty form should be invalid').toBe(false);

  await page.click('#contactForm button[type="submit"]');

  // The browser should block submit and flag the missing required field.
  const nameMissing = await page
    .locator('#cfName')
    .evaluate((el) => (el as HTMLInputElement).validity.valueMissing);
  expect(nameMissing, 'Name field should report a missing required value').toBe(true);

  // And no success toast should ever appear.
  await expect(page.locator('#cfToast')).not.toContainText('Message sent');
});
