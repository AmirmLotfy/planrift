// Landing-page visual QA: hero, after interacting with the live plan, and scroll positions.
// Usage: node scripts/qa/land.mjs [baseUrl] [outDir]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3100';
const out = process.argv[3] ?? '.kiro-cache/qa';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${w}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${w}] ${e.message}`));
  page.on('response', (r) => r.status() >= 400 && errors.push(`[${w}] HTTP ${r.status()} ${r.url()}`));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/${w}-1-hero.jpg`, type: 'jpeg', quality: 70 });
  await page.getByRole('button', { name: /Rev A/ }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${w}-2-hero-conflict.jpg`, type: 'jpeg', quality: 70 });
  const top = await page.evaluate(() => document.querySelector('#sweep').getBoundingClientRect().top + scrollY);
  const trackH = await page.evaluate(() => document.querySelector('#sweep').getBoundingClientRect().height);
  for (const [label, frac] of [['3-sweep-mid', 0.55], ['4-sweep-late', 0.8]]) {
    await page.evaluate((y) => scrollTo(0, y), top + trackH * frac - h * 0.4);
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${out}/${w}-${label}.jpg`, type: 'jpeg', quality: 70 });
  }
  for (const id of ['compare', 'review', 'kiro']) {
    await page.evaluate((sel) => document.querySelector(sel).scrollIntoView(), `#${id}`);
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${out}/${w}-5-${id}.jpg`, type: 'jpeg', quality: 70 });
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors, no failed requests');
