// Design research: screenshots of public product sites for visual reference.
// Output goes to .kiro-cache/research (git-ignored: third-party imagery is not redistributed).
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const out = '.kiro-cache/research';
mkdirSync(out, { recursive: true });
const sites = (process.argv[2] ?? '').split(',').filter(Boolean);
const browser = await chromium.launch();
const results = [];
async function capture(url) {
  const name = new URL(url).hostname.replace(/^www\./, '').replace(/\W+/g, '-');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/${name}-1.jpg`, type: 'jpeg', quality: 62 });
    await page.mouse.wheel(0, 1300);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/${name}-2.jpg`, type: 'jpeg', quality: 62 });
    results.push(`ok   ${name}`);
  } catch (e) {
    results.push(`fail ${name}: ${String(e.message).split('\n')[0]}`);
  } finally {
    await ctx.close();
  }
}
for (let i = 0; i < sites.length; i += 3) await Promise.all(sites.slice(i, i + 3).map(capture));
await browser.close();
console.log(results.join('\n'));
