import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { componentRegistry } from '../../apps/task-manager/wdf/registry';
for (const entry of componentRegistry)
  for (const fixture of entry.fixtures) {
    test(`M2-I01: isolated ${entry.id}/${fixture.id}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`/?component=${entry.id}&fixture=${fixture.id}`);
      await expect(page.locator('#fixture-root')).not.toBeEmpty();
      if (entry.id === 'dialog') {
        if (fixture.state === 'closed')
          await expect(page.getByRole('dialog')).toHaveCount(0);
        else await expect(page.getByRole('dialog')).toBeVisible();
      }
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
      expect(errors).toEqual([]);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }
for (const width of [320, 390, 768, 1024, 1440])
  for (const [density, padding] of [
    ['compact', 16],
    ['comfortable', 24],
    ['spacious', 32],
  ] as const) {
    test(`M2-R02/R03: actual TaskCard ${density} inset at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?component=task-card&fixture=${density}`);
      const measured = await page.locator('.task-card').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const meta = element
          .querySelector('.task-card__meta')!
          .getBoundingClientRect();
        const checkbox = element
          .querySelector('.checkbox')!
          .getBoundingClientRect();
        const border = parseFloat(getComputedStyle(element).borderLeftWidth);
        const inset = {
          left: meta.left - rect.left - border,
          top: meta.top - rect.top - border,
          right: rect.right - checkbox.right - border,
        };
        return { inset, padding: getComputedStyle(element).paddingLeft };
      });
      expect(measured.inset).toEqual({
        left: padding,
        top: padding,
        right: padding,
      });
      expect(measured.padding).toBe(`${padding}px`);
      await info.attach('actual-TaskCard-inset', {
        body: JSON.stringify({ width, density, measured }),
        contentType: 'application/json',
      });
    });
  }
test('M2-I02: Checkbox keyboard and label activation, Button hover/focus and disabled/busy behavior', async ({
  page,
}) => {
  await page.goto('/?component=interactive-checkbox');
  const checkbox = page.getByRole('checkbox', { name: 'Teljesítés' });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await page.getByText('Teljesítés', { exact: true }).click();
  await expect(checkbox).not.toBeChecked();
  await page.goto('/?component=button&fixture=primary');
  const button = page.getByRole('button', { name: 'Új feladat', exact: true });
  const initial = await button.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await button.hover();
  expect(
    await button.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).not.toBe(initial);
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  expect(
    await button.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe('solid');
  const defaultBounds = await button.boundingBox();
  await page.goto('/?component=button&fixture=busy');
  await expect(page.getByRole('button', { name: 'Mentés' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Mentés' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await page.goto('/?component=button&fixture=disabled');
  await expect(page.getByRole('button', { name: 'Mentés' })).toBeDisabled();
  expect(defaultBounds!.height).toBeGreaterThanOrEqual(44);
});
test('M2-I03: native Select opens and supports keyboard selection, label and disabled state', async ({
  page,
}, info) => {
  await page.goto('/?component=interactive-select');
  const select = page.getByRole('combobox', { name: 'Állapot' });
  await page.getByText('Állapot', { exact: true }).click();
  await expect(select).toBeFocused();
  await select.press('Space');
  await page.screenshot({
    path: 'docs/reports/evidence/m2/native-select-open.png',
  });
  await info.attach('native-popup-contract', {
    body: 'Native browser/OS popup intentionally owns its geometry. Opened with Space; ArrowDown and Enter exercised. Headless screenshot capture of the platform popup is environment-dependent.',
    contentType: 'text/plain',
  });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toHaveValue('open');
  await page.goto('/?component=select&fixture=disabled');
  await expect(page.getByRole('combobox')).toBeDisabled();
});
test('M2-C04: render exception stays inside its fixture boundary and reports exact owner', async ({
  page,
}) => {
  await page.goto('/?component=broken&fixture=throws');
  await expect(page.getByRole('alert')).toContainText('broken / throws');
  await expect(page.locator('#diagnostic')).toContainText(
    'M2 intentional isolated render failure',
  );
  await page.getByRole('button', { name: 'Egészséges szomszéd' }).click();
  await expect(page.locator('#healthy')).toHaveText('Működik');
});
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`M2-R04: icon/text centers for short and long Button labels at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const measurements = [];
    for (const fixture of ['primary', 'long']) {
      await page.goto(`/?component=button&fixture=${fixture}`);
      const result = await page.locator('.button').evaluate((element) => {
        const icon = element.querySelector('svg')!.getBoundingClientRect();
        const text = element
          .querySelector(':scope > span:last-child')!
          .getBoundingClientRect();
        return {
          centerDelta: Math.abs(
            icon.top + icon.height / 2 - text.top - text.height / 2,
          ),
          iconWidth: icon.width,
          iconHeight: icon.height,
          controlHeight: element.getBoundingClientRect().height,
        };
      });
      expect(result.centerDelta).toBeLessThanOrEqual(1);
      expect(result.iconWidth).toBe(20);
      expect(result.iconHeight).toBe(20);
      expect(result.controlHeight).toBeGreaterThanOrEqual(44);
      measurements.push({ fixture, ...result });
    }
    await info.attach('icon-text-geometry', {
      body: JSON.stringify({ width, measurements }),
      contentType: 'application/json',
    });
  });
}
test('M2-R09: busy Button preserves its label, name and rendered dimensions', async ({
  page,
}) => {
  await page.goto('/?component=button&fixture=disabled');
  const idle = await page
    .getByRole('button', { name: 'Mentés', exact: true })
    .boundingBox();
  await page.goto('/?component=button&fixture=busy');
  const busy = page.getByRole('button', { name: 'Mentés', exact: true });
  const bounds = await busy.boundingBox();
  expect(bounds!.width).toBe(idle!.width);
  expect(bounds!.height).toBe(idle!.height);
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveAttribute('aria-busy', 'true');
});
