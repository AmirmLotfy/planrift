#!/usr/bin/env node
// Visual QA capture: drives the real app with Playwright and saves screenshots for inspection.
// Usage: node scripts/qa/capture.mjs [baseUrl] [outDir]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3100';
const out = process.argv[3] ?? 'docs/evidence/visual';
mkdirSync(out, { recursive: true });

const sizes = (process.env.SIZES ?? '1440x900').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];

for (const [width, height] of sizes) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${width}] console: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${width}] pageerror: ${e.message}`));
  const tag = `${width}x${height}`;

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${out}/${tag}-landing.png` });
  await page.screenshot({ path: `${out}/${tag}-landing-full.png`, fullPage: true });

  await page.goto(`${base}/demo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${tag}-demo-baseline.png` });

  await page.getByRole('button', { name: /New scenario from the committed revision/ }).click();
  const hinge = page.getByTestId('hinge-input');
  await hinge.fill('3000');
  await hinge.press('Enter');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${tag}-demo-conflict.png` });

  await page.getByRole('button', { name: /New scenario from the committed revision/ }).click();
  await hinge.fill('2400');
  await hinge.press('Enter');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${tag}-demo-alternative.png` });

  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${tag}-demo-compare.png`, fullPage: true });
  await context.close();
}

await browser.close();
console.log(errors.length ? `Errors:\n${errors.join('\n')}` : 'No console errors.');
