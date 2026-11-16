import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`M0-B${width}: startup, geometry, keyboard and accessibility at ${width}px`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('requestfailed', (request) =>
      errors.push(`Request failed: ${request.url()}`),
    );
    page.on('response', (response) => {
      if (response.status() >= 400)
        errors.push(`HTTP ${response.status()}: ${response.url()}`);
    });

    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page).toHaveTitle('Feladataim · Lépés');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Feladataim' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: 'Rajzold fel a fő felhasználói útvonalat',
        exact: true,
      }),
    ).toBeVisible();

    const geometry = await page.evaluate(() => {
      const root = document.documentElement;
      const main = document.querySelector('main');
      if (!main) throw new Error('Missing main landmark');
      const bounds = main.getBoundingClientRect();
      const ids = Array.from(
        document.querySelectorAll('[id]'),
        (node) => node.id,
      );
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        left: bounds.left,
        right: bounds.right,
        duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width);
    expect(geometry.duplicateIds).toEqual([]);

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Ugrás a tartalomhoz' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    expect(
      await skip.evaluate((element) => getComputedStyle(element).outlineStyle),
    ).toBe('solid');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
    expect(errors).toEqual([]);
    await testInfo.attach('geometry-and-accessibility', {
      body: JSON.stringify(
        {
          geometry,
          axeVersion: scan.testEngine.version,
          violations: scan.violations,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
    await page.screenshot({
      path: testInfo.outputPath(`startup-${width}.png`),
      fullPage: true,
    });
  });
}
