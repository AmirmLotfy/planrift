#!/usr/bin/env node
// Captures a long page as viewport-height strips after scrolling through it once, so that
// scroll-triggered reveals have run. Usage:
//   node scripts/qa/strips.mjs <baseUrl> <route> <outDir> [WxH] [--from=<selector>] [--max=8]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base, route = '/', out = '.kiro-cache/strips', size = '1440x900', ...flags] = process.argv.slice(2);
if (!base) {
  console.error('usage: strips.mjs <baseUrl> <route> <outDir> [WxH] [--from=<selector>] [--max=8]');
  process.exit(1);
}
const [w, h] = size.split('x').map(Number);
const from = flags.find((f) => f.startsWith('--from='))?.slice(7);
const max = Number(flags.find((f) => f.startsWith('--max='))?.slice(6) ?? 8);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 200)}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`));
await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
const start = from ? await page.evaluate((s) => document.querySelector(s)?.getBoundingClientRect().top + scrollY, from) : 0;
const total = await page.evaluate(() => document.documentElement.scrollHeight);
// Walk down the page so IntersectionObserver reveals fire, then shoot each strip in place.
let n = 0;
for (let y = start ?? 0; y < total && n < max; y += h, n += 1) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${out}/strip-${String(n).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 70 });
}
await browser.close();
console.log(`${n} strips from y=${start} of ${total}px`);
console.log(problems.length ? `PROBLEMS\n${problems.join('\n')}` : 'ok: no console errors');
