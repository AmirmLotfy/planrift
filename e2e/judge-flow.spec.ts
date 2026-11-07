import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Numbers below are the hand-computed oracle in docs/geometry/GEOMETRY_CONTRACT.md §7. */

async function startScenario(page: Page) {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'New scenario from the committed revision' }).first().click();
}

test.describe('landing', () => {
  test('hero shows the live model and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('revision breaks');
    await expect(page.locator('#hero-hinge')).toHaveValue('1700');
    await expect(page.getByRole('img', { name: /White study model of R-512/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('the slider drives the engine: 3,000 mm conflicts, 2,400 mm passes', async ({ page }) => {
    await page.goto('/');
    const slider = page.locator('#hero-hinge');
    await slider.focus();
    await slider.fill('3000');
    const panel = page.locator('output[for="hero-hinge"]');
    await expect(panel).toHaveText('3,000 mm');
    await expect(page.locator('#model [data-status="CONFLICT"]').first()).toBeVisible();
    await slider.fill('2400');
    await expect(panel).toHaveText('2,400 mm');
    await expect(page.locator('#model [data-status="PASS"]').first()).toBeVisible();
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  });
});

test.describe('studio', () => {
  test('Revision A conflicts with F-07 at 15.7°, Revision B passes at 391.5 mm', async ({ page }) => {
    await startScenario(page);
    const hinge = page.getByTestId('hinge-input');
    await hinge.fill('3000');
    await hinge.press('Enter');
    await expect(page.getByTestId('analysis-headline')).toContainText('15.7°');
    await expect(page.getByTestId('metric-clearance')).toContainText('188.7 mm');
    await hinge.fill('2400');
    await hinge.press('Enter');
    await expect(page.getByTestId('metric-clearance')).toContainText('391.5 mm');
  });

  test('invalid position 5,400 mm is reported, not passed', async ({ page }) => {
    await startScenario(page);
    const hinge = page.getByTestId('hinge-input');
    await hinge.fill('5400');
    await hinge.press('Enter');
    await expect(page.getByTestId('analysis-headline')).toContainText('250 mm beyond');
  });

  test('Model view renders without errors and switching back to Plan is clean', async ({ page }, info) => {
    test.skip(info.project.name === 'phone', 'Mode switch is covered on desktop; the phone uses a bottom sheet.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await startScenario(page);
    await page.getByRole('button', { name: 'Model', exact: true }).click();
    await expect(page.getByTestId('model-viewport')).toBeVisible();
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await page.getByRole('button', { name: 'Model', exact: true }).click();
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await startScenario(page);
    await page.waitForTimeout(1000);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  });
});
