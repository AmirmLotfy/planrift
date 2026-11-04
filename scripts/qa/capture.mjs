#!/usr/bin/env node
// Studio visual QA: drives the real /demo with Playwright and saves JPEG screenshots for inspection.
// Flow: open /demo → New scenario → hinge 3000 → New scenario → hinge 2400 → review dialog → Compare,
// plus Split/Model views on wide screens and the bottom-sheet tabs and layers sheet on phones.
// Usage: SIZES=1440x900,1024x768,390x844 node scripts/qa/capture.mjs [baseUrl] [outDir]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3100';
const out = process.argv[3] ?? '.kiro-cache/studio';
mkdirSync(out, { recursive: true });

const sizes = (process.env.SIZES ?? '1440x900').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];

for (const [width, height] of sizes) {
  const phone = width < 820;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1 });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${width}] console: ${m.text().slice(0, 240)}`));
  page.on('pageerror', (e) => errors.push(`[${width}] pageerror: ${e.message.slice(0, 240)}`));
  const tag = `${width}x${height}`;
  const shot = async (name, options = {}) => {
    await page.waitForTimeout(options.wait ?? 700);
    await page.screenshot({ path: `${out}/${tag}-${name}.jpg`, type: 'jpeg', quality: 72, fullPage: options.fullPage ?? false });
  };
  const newScenario = () => page.getByRole('button', { name: /New scenario from the committed revision/ }).click();
  const setHinge = async (mm) => {
    const hinge = page.getByTestId('hinge-input');
    await hinge.fill(String(mm));
    await hinge.press('Enter');
  };

  await page.goto(`${base}/demo`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-hydrated="true"]');
  await shot('1-baseline', { wait: 1200 });

  await newScenario();
  await setHinge(3000);
  await shot('2-conflict', { wait: 1400 });

  if (phone) {
    for (const tab of ['Result', 'Documents', 'Decision']) {
      await page.getByRole('tab', { name: new RegExp(tab) }).click();
      await shot(`2-tab-${tab.toLowerCase()}`);
    }
    await page.getByRole('tab', { name: /Position/ }).click();
    await page.getByTestId('layers-toggle').click();
    await shot('2-layers-sheet');
    await page.keyboard.press('Escape');
  }

  await newScenario();
  await setHinge(2400);
  await shot('3-alternative', { wait: 1400 });

  await page.getByTestId('primary-action').click();
  await shot('4-review-dialog');
  await page.keyboard.press('Escape');

  if (phone) {
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitemcheckbox', { name: 'Compare alternatives' }).click();
  } else {
    await page.getByRole('button', { name: 'Compare', exact: true }).click();
  }
  await shot('5-compare');
  await shot('5-compare-full', { fullPage: true, wait: 100 });

  if (!phone) {
    await page.getByRole('button', { name: 'Open Revision A' }).click();
    await page.getByRole('button', { name: 'Split', exact: true }).click();
    await shot('6-split', { wait: 2500 });
    await page.getByRole('button', { name: 'Model', exact: true }).click();
    await shot('7-model', { wait: 2000 });
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
  }
  await context.close();
}

await browser.close();
console.log(errors.length ? `Errors:\n${errors.join('\n')}` : 'No console errors.');
