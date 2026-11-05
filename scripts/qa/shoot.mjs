#!/usr/bin/env node
// Screenshot any route at several viewport sizes (viewport shot + optional full page) for visual review.
// Usage: node scripts/qa/shoot.mjs <baseUrl> <route> <outDir> [WxH,WxH,...] [--full] [--scroll=0,0.5,1 | --vh=0,1.5,3]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base, route = '/', out = '.kiro-cache/shots', sizesArg = '1440x900,390x844', ...flags] = process.argv.slice(2);
if (!base) {
  console.error('usage: shoot.mjs <baseUrl> <route> <outDir> [sizes] [--full] [--scroll=0,0.5,1]');
  process.exit(1);
}
const full = flags.includes('--full');
const scrollArg = flags.find((f) => f.startsWith('--scroll='));
const vhArg = flags.find((f) => f.startsWith('--vh='));
const waitArg = flags.find((f) => f.startsWith('--wait='));
const settle = waitArg ? Number(waitArg.slice(7)) : 1600;
const scrolls = scrollArg ? scrollArg.slice(9).split(',').map(Number) : [0];
const vhs = vhArg ? vhArg.slice(5).split(',').map(Number) : null;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const problems = [];
for (const [w, h] of sizesArg.split(',').map((s) => s.split('x').map(Number))) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && problems.push(`[${w}] console: ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => problems.push(`[${w}] pageerror: ${e.message.slice(0, 200)}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`[${w}] HTTP ${r.status()} ${r.url()}`));
  await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const name = route.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home';
  for (const vh of vhs ?? []) {
    await page.evaluate((v) => window.scrollTo(0, innerHeight * v), vh);
    await page.waitForTimeout(settle);
    await page.screenshot({ path: `${out}/${name}-${w}-vh${Math.round(vh * 100)}.jpg`, type: 'jpeg', quality: 72 });
  }
  for (const frac of vhs ? [] : scrolls) {
    await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), frac);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${out}/${name}-${w}-s${Math.round(frac * 100)}.jpg`, type: 'jpeg', quality: 72 });
  }
  if (full) await page.screenshot({ path: `${out}/${name}-${w}-full.jpg`, type: 'jpeg', quality: 60, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log(problems.length ? `PROBLEMS\n${problems.join('\n')}` : 'ok: no console errors, no failed requests');
