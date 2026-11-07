#!/usr/bin/env node
// Captures the submission screenshots from a running (ideally the deployed) app at 2x DPR.
// Usage: node scripts/qa/submission-shots.mjs <baseUrl> <outDir>
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base, out = 'docs/submission/screenshots'] = process.argv.slice(2);
if (!base) {
  console.error('usage: submission-shots.mjs <baseUrl> <outDir>');
  process.exit(1);
}
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));
page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('captured', name);
};
const scrollTo = async (selectorOrVh, settle = 2200) => {
  await page.evaluate((s) => {
    if (typeof s === 'number') window.scrollTo(0, innerHeight * s);
    else document.querySelector(s)?.scrollIntoView({ block: 'start' });
  }, selectorOrVh);
  await page.waitForTimeout(settle);
};

// Landing
await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(6000);
await shot('01-landing-hero');
await scrollTo(1.25, 5000);
await shot('02-landing-conflict');
await scrollTo(2.6, 5000);
await shot('03-landing-drawing');
await scrollTo(3.4, 4000);
await shot('04-landing-reissue');
await scrollTo('#fit', 2500);
await shot('05-landing-hinge-map');
await scrollTo('#compare', 3000);
await shot('06-landing-compare');
await scrollTo('#review', 3000);
await shot('07-landing-review-documents');
await scrollTo('#kiro', 3000);
await shot('08-landing-kiro');

// Studio
await page.goto(base + '/demo', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'Hide the getting-started tips' }).first().click().catch(() => {});
await page.getByRole('button', { name: 'New scenario from the committed revision' }).first().click();
await page.waitForTimeout(800);
const hinge = page.getByTestId('hinge-input');
await hinge.fill('3000');
await hinge.press('Enter');
await page.waitForTimeout(1500);
await shot('09-studio-conflict-3000');
await page.getByRole('button', { name: 'Model', exact: true }).click();
await page.waitForTimeout(5500);
await shot('10-studio-model-conflict-3000');
await page.getByRole('button', { name: 'Plan', exact: true }).click();
await page.waitForTimeout(800);
// Second scenario from the committed revision, door at 2,400 mm.
await page.getByRole('button', { name: /^New/ }).first().click();
await page.waitForTimeout(800);
await page.getByTestId('hinge-input').fill('2400');
await page.getByTestId('hinge-input').press('Enter');
await page.waitForTimeout(1500);
await shot('11-studio-pass-2400');
await page.getByRole('button', { name: 'Compare', exact: true }).first().click();
await page.waitForTimeout(2500);
await shot('12-studio-compare');
await page.getByRole('button', { name: 'Back to editing' }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: /^Review/ }).first().click();
await page.getByRole('button', { name: 'Submit for review' }).click();
await page.waitForTimeout(1200);
await page.getByRole('checkbox').first().check();
await page.getByRole('textbox').last().fill('Full swing clear. Reissue the flagged sheets.');
await page.waitForTimeout(500);
await shot('13-studio-decision');
await page.getByRole('button', { name: 'Accept & commit' }).click();
await page.waitForTimeout(2500);
await shot('14-studio-committed');
await browser.close();
console.log(problems.length ? `PROBLEMS\n${problems.join('\n')}` : 'ok: no console errors');
