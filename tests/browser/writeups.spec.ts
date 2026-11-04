import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadReports } from '../../src/lib/writeups-core.mjs';
import AxeBuilder from '@axe-core/playwright';

const slugs = ['htb-shells-payloads', 'htb-metasploit', 'htb-password-attacks', 'htb-footprinting', 'thm-flarevm-arsenal', 'thm-soc-level-1'];
const reports = loadReports();
const total = reports.length;
const htbCount = reports.filter(r => r.platform === 'HTB').length;
const thmCount = reports.filter(r => r.platform === 'THM').length;

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|api\.github\.com)/, route => route.abort());
});

test('one canonical card per unit and working platform filters', async ({ page }, info) => {
  await page.goto('/writeups/');
  const cards = page.locator('[data-wu-slug]');
  await expect(cards).toHaveCount(total);
  for (const slug of slugs) await expect(page.locator(`[data-wu-slug="${slug}"]`)).toHaveCount(1);
  await expect(page.getByText('Local review — includes drafts', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: `HTB Academy (${htbCount})` }).click();
  await expect(page.locator('[data-wu-slug]:visible')).toHaveCount(htbCount);
  await page.getByRole('button', { name: `TryHackMe (${thmCount})` }).click();
  await expect(page.locator('[data-wu-slug]:visible')).toHaveCount(thmCount);
  await page.getByRole('button', { name: `All (${total})` }).click();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: info.outputPath('writeups-index.png'), fullPage: true });
});

test('Shells contains all 17 walkthrough headings and complete conclusions', async ({ page }, info) => {
  await page.goto('/writeups/htb-shells-payloads/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.wu-markdown h3').filter({ hasText: /^\d{2} — / })).toHaveCount(17);
  for (const name of ['7. Troubleshooting and Technical Limitations', '8. Results and Evidence', '9. Security Implications', '10. Lessons Learned', '11. References']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  const report = reports.find(r => r.slug === 'htb-shells-payloads')!;
  await expect(page.locator('.wu-detail-meta')).toContainText(`${report.dateVerification === 'verified' ? 'Documented' : 'Source date (unverified)'}: ${report.date}`);
  if (report.evidenceStatus === 'pending') await expect(page.locator('.wu-article')).toContainText('Evidence Pending');
  if (!report.approved) await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await page.screenshot({ path: info.outputPath('shells-article.png') });
  await page.getByRole('navigation', { name: 'Table of contents' }).getByRole('link', { name: '17 — Detection & Prevention', exact: true }).click();
  await expect(page).toHaveURL(/#17--detection--prevention$/);
});

test('Metasploit keeps 15 module topics and independent FortiLogger boundaries', async ({ page }) => {
  await page.goto('/writeups/htb-metasploit/');
  await expect(page.locator('.wu-markdown h2').filter({ hasText: /^(0[1-9]|1[0-5])\./ })).toHaveCount(15);
  await expect(page.getByRole('heading', { name: 'Related Practical Case Study — FortiLogger / Meterpreter', exact: true })).toBeVisible();
  await expect(page.locator('.wu-markdown')).toContainText('Meterpreter session 2 opened');
  await expect(page.locator('.wu-markdown')).toContainText('Incorrect function');
  await expect(page.locator('.wu-markdown')).toContainText('administrative/SYSTEM privileges remain unverified');
});

test('Password Attacks retains 26 chapters and the full NEXURA assessment', async ({ page }) => {
  await page.goto('/writeups/htb-password-attacks/');
  await expect(page.locator('.wu-markdown h2').filter({ hasText: /^Section \d{2} — / })).toHaveCount(26);
  for (const text of ['Section 26 — Skills Assessment: NEXURA', '7. SMB Negotiation Troubleshooting', '9. Assessment Question: Domain Administrator NTLM', '10. Results and Verification', '12. Defensive Perspective']) {
    await expect(page.locator('.wu-markdown').getByRole('heading', { name: text, exact: true })).toBeVisible();
  }
  await expect(page.locator('.wu-markdown')).toContainText('Outcomes Not Verified Locally');
  expect((await page.locator('.wu-markdown').innerText()).split(/\s+/).length).toBeGreaterThan(6500);
});

test('all canonical reports fit the viewport and preserve the navigation', async ({ page }, info) => {
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 844 });
  for (const slug of slugs) {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(`/writeups/${slug}/`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('.wu-article')).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll, slug).toBeLessThanOrEqual(dimensions.width);
    await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Research', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  }
});

test('search combines with platform filters, announces results and restores a shareable query', async ({ page }) => {
  await page.goto('/writeups/');
  const search = page.getByRole('searchbox', { name: 'Search reports' });
  await search.fill('NEXURA');
  const matches = reports.filter(r => [r.title, r.summary, r.category, r.unitId, ...r.tags].join(' ').toLowerCase().includes('nexura')).length;
  await expect(page.locator('[data-wu-slug]:visible')).toHaveCount(matches);
  await expect(page.locator('[data-writeup-count]')).toHaveText(`${matches} of ${total} reports`);
  await expect(page).toHaveURL(/q=NEXURA/);
  await page.getByRole('button', { name: `TryHackMe (${thmCount})` }).click();
  await expect(page.locator('[data-writeup-empty]')).toBeVisible();
  await expect(page.locator('[data-writeup-count]')).toHaveText(`0 of ${total} reports`);
  await page.reload();
  await expect(search).toHaveValue('NEXURA');
  await expect(page.getByRole('button', { name: `TryHackMe (${thmCount})` })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('[data-wu-slug]:visible')).toHaveCount(total);
  await expect(search).toBeFocused();
  await expect(page).toHaveURL('http://127.0.0.1:4321/writeups/');
});

test('article TOC collapses, reading shortcut works and copy preserves exact code', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { document.documentElement.dataset.copiedCode = value; } } });
  });
  await page.goto('/writeups/htb-metasploit/');
  const toc = page.getByRole('navigation', { name: 'Table of contents' });
  await expect(toc.locator('details')).not.toHaveAttribute('open');
  await toc.locator('summary').click();
  await expect(toc.locator('details')).toHaveAttribute('open');
  await toc.locator('summary').click();
  await expect(toc.locator('details')).not.toHaveAttribute('open');
  await page.getByRole('link', { name: 'Start reading ↓', exact: true }).click();
  await expect(page).toHaveURL(/#report-content$/);
  await expect(page.locator('#report-content')).toBeFocused();
  const block = page.locator('.wu-code-block').first();
  const original = await block.locator('code').textContent();
  await block.getByRole('button').click();
  await expect(block.getByRole('button')).toHaveText('Copied');
  expect(await page.locator('html').getAttribute('data-copied-code')).toBe(original);
  await page.evaluate(() => { Object.defineProperty(navigator.clipboard, 'writeText', { value: async () => { throw new Error('Clipboard unavailable'); } }); });
  await block.getByRole('button').click();
  await expect(page.locator('[data-copy-status]')).toContainText('Select the code and copy it manually.');
});

test('keyboard users have a skip link and the current page is announced', async ({ page }) => {
  await page.goto('/writeups/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Write-ups', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('h1')).toHaveText('Write-ups.');
  expect(await page.locator('.wu-card').first().evaluate(e => e.getBoundingClientRect().top)).toBeLessThan(844);
});

test('reports remain readable and native TOC works without JavaScript', async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: info.project.use.viewport });
  try {
    const page = await context.newPage();
    await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|api\.github\.com)/, route => route.abort());
    await page.goto('http://127.0.0.1:4321/writeups/');
    await expect(page.locator('[data-wu-slug]')).toHaveCount(total);
    await expect(page.locator('[data-writeup-tools]')).toBeHidden();
    await page.goto('http://127.0.0.1:4321/writeups/htb-shells-payloads/');
    await expect(page.locator('.wu-markdown h3').filter({ hasText: /^\d{2} — / })).toHaveCount(17);
    await page.locator('.wu-toc summary').click();
    await expect(page.locator('.wu-toc details')).not.toHaveAttribute('open');
  } finally { await context.close(); }
});

test('automated WCAG accessibility checks pass on portfolio and write-up pages', async ({ page }) => {
  test.setTimeout(90000);
  for (const route of ['/', '/research/', '/projects/', '/about/', '/writeups/', '/writeups/htb-metasploit/', '/writeups/htb-password-attacks/']) {
    await page.goto(route);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(result.violations, `${route}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  }
});

test('Home, Research, Projects, About and all four CVE URLs respond', async ({ request }) => {
  for (const route of ['/', '/research/', '/projects/', '/about/', '/research/log4shell/', '/research/pwnkit/', '/research/dirty-pipe/', '/research/spring4shell/']) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expect(await response.text()).toContain('NERO.');
  }
});

test('normal dev reflects source updates without changing card count', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop', 'Run source mutation once');
  const file = 'content/writeups/htb-footprinting.md';
  const original = fs.readFileSync(file, 'utf8');
  const marker = 'NERO local refresh regression marker';
  try {
    fs.writeFileSync(file, original + `\n## Preview verification\n\n${marker}\n`);
    await expect.poll(async () => (await (await request.get('/writeups/htb-footprinting/')).text()).includes(marker)).toBe(true);
    const index = await (await request.get('/writeups/')).text();
    expect((index.match(/data-wu-slug=/g) || []).length).toBe(total);
  } finally { fs.writeFileSync(file, original); }
  await expect.poll(async () => (await (await request.get('/writeups/htb-footprinting/')).text()).includes(marker)).toBe(false);
});

test('busy 4321 is reported and the existing server remains healthy', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop', 'Run process conflict check once');
  const result = spawnSync(process.execPath, ['scripts/astro-local.mjs', 'dev'], { encoding: 'utf8', timeout: 10000 });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('EADDRINUSE');
  expect(result.stderr).toContain('4321');
  expect(result.stderr).toContain('No process was terminated');
  expect((await request.get('/writeups/')).status()).toBe(200);
});
