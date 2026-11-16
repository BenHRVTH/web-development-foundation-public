import { expect, test } from '../lab-regression';
import type { Page } from '@playwright/test';

async function geometry(page: Page) {
  return page.locator('.preview-scroll').evaluate((canvas) => {
    const style = getComputedStyle(canvas);
    const frame = canvas.querySelector('iframe')!;
    const bounds = frame.getBoundingClientRect();
    return {
      available:
        canvas.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight),
      width: bounds.width,
      scrollWidth: canvas.scrollWidth,
      clientWidth: canvas.clientWidth,
      transform: getComputedStyle(frame).transform,
    };
  });
}
for (const [labWidth, expected] of [
  [320, 320],
  [390, 320],
  [760, 390],
  [1024, 390],
  [1440, 768],
  [1720, 1024],
  [1960, 1440],
] as const) {
  test(`M3-V01: ${labWidth}px Lab initially selects the largest fully fitting viewport (${expected}px)`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: labWidth, height: 900 });
    await page.goto('/');
    await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
    await expect(
      page.getByRole('button', { name: `${expected} CSS px`, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    const rendered = await geometry(page);
    expect(rendered.width).toBe(expected);
    expect(rendered.transform).toBe('none');
    const preview = page
      .frames()
      .find((f) => f.url().startsWith('http://127.0.0.1:5176'))!;
    expect(await preview.evaluate(() => window.innerWidth)).toBe(expected);
    if (expected <= rendered.available) {
      expect(rendered.scrollWidth).toBeLessThanOrEqual(rendered.clientWidth);
      expect(
        [320, 390, 768, 1024, 1440].filter(
          (w) => w > expected && w <= rendered.available,
        ),
      ).toEqual([]);
      await expect(page.locator('.viewport-notice')).toHaveCount(0);
    } else {
      expect(expected).toBe(320);
      await expect(page.locator('.viewport-notice')).toContainText(
        '320 CSS px-es nézet sem fér el teljesen',
      );
      await page
        .locator('.preview-scroll')
        .evaluate((canvas) => (canvas.scrollLeft = canvas.scrollWidth));
      const reachability = await page
        .locator('.preview-scroll')
        .evaluate((canvas) => {
          const area = canvas.getBoundingClientRect();
          const frame = canvas.querySelector('iframe')!.getBoundingClientRect();
          return {
            scrollLeft: canvas.scrollLeft,
            fullyVisible:
              frame.left >= area.left &&
              frame.right <= area.left + canvas.clientWidth,
          };
        });
      // Reserved gutter/padding can leave the minimum frame visible without a scroll range.
      // If it is physically clipped, the horizontal scroll must make it reachable.
      expect(reachability.scrollLeft > 0 || reachability.fullyVisible).toBe(
        true,
      );
      if (labWidth === 320) expect(reachability.scrollLeft).toBeGreaterThan(0);
      await page
        .locator('.preview-scroll')
        .evaluate((canvas) => (canvas.scrollLeft = 0));
    }
    await page.screenshot({
      path: `docs/reports/evidence/m3/viewport-initial-${labWidth}.png`,
      fullPage: true,
    });
    await info.attach('initial-viewport-geometry', {
      body: JSON.stringify({ labWidth, expected, ...rendered }),
      contentType: 'application/json',
    });
  });
}

test('M3-V02: manual oversized viewport scrolls and survives Lab resizing/panel changes with application state intact', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1100 });
  await page.goto('/');
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  const preview = page.frameLocator('iframe');
  await preview
    .getByRole('button', { name: 'Új feladat', exact: true })
    .click();
  await preview
    .getByRole('textbox', { name: /Feladat neve/ })
    .fill('Megőrzött viewport feladat');
  await preview
    .getByRole('dialog')
    .getByRole('button', { name: 'Feladat létrehozása' })
    .click();
  await preview
    .getByRole('checkbox', { name: 'Teljesítés: Megőrzött viewport feladat' })
    .check();
  await preview
    .getByRole('combobox', { name: 'Állapot' })
    .selectOption('completed');
  await expect(preview.getByRole('article')).toHaveCount(3);
  const originalFrame = page
    .frames()
    .find((f) => f.url().startsWith('http://127.0.0.1:5176'))!;
  await originalFrame.evaluate(() => {
    (window as unknown as Record<string, unknown>)['viewportStateProbe'] =
      'preserved';
  });
  await page.getByRole('button', { name: '1440 CSS px', exact: true }).click();
  for (const width of [390, 760, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole('button', { name: '1440 CSS px', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect((await geometry(page)).width).toBe(1440);
    expect(await originalFrame.evaluate(() => window.innerWidth)).toBe(1440);
    expect(
      await originalFrame.evaluate(
        () =>
          (window as unknown as Record<string, unknown>)['viewportStateProbe'],
      ),
    ).toBe('preserved');
    await expect(
      preview.getByRole('combobox', { name: 'Állapot' }),
    ).toHaveValue('completed');
    await expect(preview.getByRole('article')).toHaveCount(3);
  }
  await page.setViewportSize({ width: 1024, height: 900 });
  await page
    .locator('.preview-scroll')
    .evaluate((canvas) => (canvas.scrollLeft = 400));
  expect(
    await page
      .locator('.preview-scroll')
      .evaluate((canvas) => canvas.scrollLeft),
  ).toBe(400);
  await page.screenshot({
    path: 'docs/reports/evidence/m3/viewport-manual-scroll.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Beállítások', exact: true }).click();
  await page.getByRole('button', { name: 'Beállítások', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '1440 CSS px', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await preview
    .getByRole('link', { name: 'Megőrzött viewport feladat', exact: true })
    .click();
  await preview
    .getByRole('button', { name: 'Szerkesztés', exact: true })
    .click();
  const title = preview.getByRole('textbox', { name: /Feladat neve/ });
  await title.fill('Megmaradó nem mentett űrlapérték');
  await page.setViewportSize({ width: 390, height: 900 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(title).toHaveValue('Megmaradó nem mentett űrlapérték');
  await expect(title).toBeFocused();
  expect(await originalFrame.evaluate(() => location.hash)).toBe(
    '#tasks/task-007',
  );
});

test('M3-V03: below-minimum fallback remains predictable after resize and can be changed explicitly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await expect(page.locator('.viewport-notice')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.viewport-notice')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '320 CSS px', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '390 CSS px', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(
    page.getByRole('button', { name: '390 CSS px', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.viewport-notice')).toBeVisible();
});
