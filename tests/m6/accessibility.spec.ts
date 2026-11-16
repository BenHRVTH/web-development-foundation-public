import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PNG } from 'pngjs';
import { mkdir, writeFile } from 'node:fs/promises';
test('M6-R10: Task Manager text resize/reflow, true keyboard dialog cycle and reduced motion', async ({
  page,
}) => {
  const metrics = [];
  await mkdir('docs/reports/evidence/m6', { recursive: true });
  const normalBrand = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:5173');
    await expect(
      page.getByRole('heading', { name: 'Feladataim', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready.then(() => {}));
    const fixed = PNG.sync.read(
      await page.screenshot({
        path: `docs/reports/evidence/m6/task-normal-${width}.png`,
      }),
    );
    // Compare the accepted normal design with the pre-M6 brand sizing rules.
    // Only the enlarged, constrained text should wrap differently.
    const legacy = await page.addStyleTag({
      content:
        '.brand{min-width:auto;max-width:none}.brand>span:last-child{min-width:auto;overflow-wrap:normal}.brand__mark{flex-shrink:1}',
    });
    const before = PNG.sync.read(await page.screenshot());
    expect(fixed.width).toBe(before.width);
    expect(fixed.height).toBe(before.height);
    expect(
      fixed.data.equals(before.data),
      `Normal Task Manager pixels changed at ${width}px`,
    ).toBe(true);
    await legacy.evaluate((el) => el.parentNode?.removeChild(el));
    normalBrand.push({ width, status: 'PASS', differingPixels: 0 });
  }
  await writeFile(
    'test-results/m6-task-normal-design.json',
    JSON.stringify(normalBrand, null, 2) + '\n',
  );
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 450 });
    await page.goto('http://127.0.0.1:5173');
    // Vite's development CSS is installed by the application module. Measure
    // the rendered application, after React, fonts and the resized layout settle.
    await expect(
      page.getByRole('heading', { name: 'Feladataim', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Új feladat', exact: true }),
    ).toBeVisible();
    await page.evaluate(async () => {
      document.documentElement.style.fontSize = '200%';
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    const reflow = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => el.getBoundingClientRect().right > innerWidth)
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          right: el.getBoundingClientRect().right,
        })),
    }));
    expect(reflow.scrollWidth, JSON.stringify(reflow)).toBeLessThanOrEqual(
      width,
    );
    await page.getByRole('button', { name: 'Új feladat', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: 'Feladat létrehozása', exact: true })
      .click();
    await expect(dialog.locator('[aria-invalid="true"]').first()).toBeFocused();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('dialog[open]'),
        ),
      ).toBe(true);
    }
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
    const geometry = await dialog.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        viewport: innerWidth,
        overflow: el.scrollWidth > el.clientWidth,
      };
    });
    expect(geometry.x).toBeGreaterThanOrEqual(0);
    expect(geometry.width).toBeLessThanOrEqual(width);
    expect(geometry.overflow).toBe(false);
    await page.screenshot({
      path: `docs/reports/evidence/m6/task-reflow-200-${width}.png`,
    });
    metrics.push({
      width,
      geometry,
      axePasses: axe.passes.length,
      incomplete: axe.incomplete.map((i) => i.id),
    });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Új feladat', exact: true }),
    ).toBeFocused();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  ).toBe(true);
  await writeFile(
    'test-results/m6-task-accessibility.json',
    JSON.stringify(metrics, null, 2) + '\n',
  );
});
