import { expect, test } from '../lab-regression';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { isolatedLab } from '../isolated-lab';
const app = (page: Page) => page.frameLocator('iframe');
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await expect(app(page).getByRole('article')).toHaveCount(6);
}
const field = (page: Page, id: string) => page.locator(`[data-token="${id}"]`);
const textField = (page: Page, id: string) =>
  field(page, id).locator('input:not([type="color"])');

test('M3-B01: project-local startup; real create/edit/complete/filter/navigation/keyboard survives live edits', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  const source = await readFile('apps/task-manager/wdf/tokens.json', 'utf8');
  const preview = app(page);
  await preview
    .getByRole('button', { name: 'Új feladat', exact: true })
    .click();
  const dialog = preview.getByRole('dialog');
  const title = dialog.getByRole('textbox', { name: /Feladat neve/ });
  await expect(title).toBeFocused();
  await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await title.fill('M3 munkamenet feladata');
  await dialog
    .getByRole('textbox', { name: 'Leírás', exact: true })
    .fill('Megmaradó alkalmazásállapot');
  await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
  await expect(preview.getByRole('article')).toHaveCount(7);
  await textField(page, 'primitive.color.accent').fill('#126174');
  await expect(preview.locator('.button--primary').first()).toHaveCSS(
    'background-color',
    'rgb(18, 97, 116)',
  );
  await expect(preview.getByRole('article')).toHaveCount(7);
  await preview
    .getByRole('link', { name: 'M3 munkamenet feladata', exact: true })
    .click();
  await expect(preview.getByRole('heading', { level: 1 })).toBeFocused();
  await preview
    .getByRole('button', { name: 'Szerkesztés', exact: true })
    .click();
  await expect(title).toHaveValue('M3 munkamenet feladata');
  await title.fill('Módosított M3 feladat');
  await dialog.getByRole('button', { name: 'Módosítások mentése' }).click();
  await preview
    .getByRole('checkbox', { name: 'Teljesítés: Módosított M3 feladat' })
    .check();
  await preview
    .getByRole('combobox', { name: 'Állapot' })
    .selectOption('completed');
  await expect(preview.getByRole('article')).toHaveCount(3);
  await page.getByRole('button', { name: '390 CSS px', exact: true }).click();
  await expect(preview.getByRole('article')).toHaveCount(3);
  await expect(preview.locator('html')).toHaveJSProperty('clientWidth', 390);
  await preview
    .getByRole('link', { name: 'Módosított M3 feladat', exact: true })
    .click();
  // Hash navigation commits asynchronously. Assert the destination before a
  // strict locator that is plural in the preceding list view.
  await expect(
    preview.getByRole('heading', {
      level: 1,
      name: 'A feladat részletei',
      exact: true,
    }),
  ).toBeVisible();
  await expect(preview.getByRole('article')).toHaveCount(1);
  await expect(preview.getByRole('article')).toContainText(
    'Megmaradó alkalmazásállapot',
  );
  await expect(preview.getByRole('heading', { level: 1 })).toBeFocused();
  await preview
    .getByRole('button', { name: 'Szerkesztés', exact: true })
    .click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    preview.getByRole('button', { name: 'Szerkesztés', exact: true }),
  ).toBeFocused();
  expect(await readFile('apps/task-manager/wdf/tokens.json', 'utf8')).toBe(
    source,
  );
  expect(errors).toEqual([]);
});

test('M3-B02: typed color, font, spacing, shapes, layout and declared responsive values update the real app', async ({
  page,
}) => {
  await ready(page);
  const preview = app(page);
  await textField(page, 'primitive.color.accent').fill('broken');
  await expect(textField(page, 'primitive.color.accent')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(field(page, 'primitive.color.accent')).toContainText(
    'SCHEMA_INVALID',
  );
  await expect(preview.locator('.button--primary').first()).toHaveCSS(
    'background-color',
    'rgb(91, 60, 180)',
  );
  await page.screenshot({
    path: 'docs/reports/evidence/m3/lab-invalid-color.png',
    fullPage: true,
  });
  await textField(page, 'primitive.color.accent').fill('#123456');
  await expect(preview.locator('.button--primary').first()).toHaveCSS(
    'background-color',
    'rgb(18, 52, 86)',
  );
  await page.screenshot({
    path: 'docs/reports/evidence/m3/lab-live-color.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Typography', exact: true }).click();
  await textField(page, 'primitive.font.body').fill('Georgia, serif');
  await expect(preview.locator('body')).toHaveCSS(
    'font-family',
    'Georgia, serif',
  );
  await textField(page, 'primitive.size.heading').fill('56');
  await expect(preview.locator('h1')).toHaveCSS('font-size', '56px');
  await page.getByRole('button', { name: 'Spacing', exact: true }).click();
  await field(page, 'semantic.space.group')
    .getByLabel('semantic.space.group érték módja')
    .selectOption('value');
  await textField(page, 'semantic.space.group').fill('19');
  await expect(field(page, 'semantic.space.group')).toContainText(
    'SPACING_OUT_OF_SCALE',
  );
  await textField(page, 'semantic.space.group').fill('48');
  await expect(preview.locator('html')).toHaveCSS(
    '--wdf-semantic--space--group',
    '3rem',
  );
  await page.getByLabel('Értékek hatóköre').selectOption('tablet');
  await field(page, 'semantic.space.page')
    .getByLabel('semantic.space.page érték módja')
    .selectOption('value');
  await textField(page, 'semantic.space.page').fill('80');
  await expect(preview.locator('html')).toHaveCSS(
    '--wdf-semantic--space--page',
    '5rem',
  );
  await page.getByRole('button', { name: '390 CSS px', exact: true }).click();
  await expect(preview.locator('html')).toHaveCSS(
    '--wdf-semantic--space--page',
    '1.5rem',
  );
  await page.getByRole('button', { name: '1024 CSS px', exact: true }).click();
  await expect(preview.locator('html')).toHaveCSS(
    '--wdf-semantic--space--page',
    '4rem',
  );
  await page.getByLabel('Értékek hatóköre').selectOption('');
  await page.getByRole('button', { name: 'Shapes', exact: true }).click();
  await textField(page, 'primitive.geometry.control-radius').fill('20');
  await expect(preview.locator('.task-card').first()).toHaveCSS(
    'border-radius',
    '20px',
  );
  await page.getByRole('button', { name: 'Layout', exact: true }).click();
  await textField(page, 'primitive.geometry.width').fill('900');
  await expect(preview.locator('html')).toHaveCSS(
    '--wdf-primitive--geometry--width',
    '56.25rem',
  );
  await page.reload();
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await expect(preview.locator('.button--primary').first()).toHaveCSS(
    'background-color',
    'rgb(18, 52, 86)',
  );
});

test('M3-B03: malformed existing values remain visible and repairable one at a time; no invalid CSS is emitted', async ({
  page,
}) => {
  const isolated = await isolatedLab({
    port: 5198,
    invalid: true,
    configure: async (root) => {
      const { join } = await import('node:path');
      const { writeFile } = await import('node:fs/promises');
      const path = join(root, 'wdf/tokens.json');
      const data = JSON.parse(await readFile(path, 'utf8'));
      data.tokens['primitive.color.ink'].value = 'invalid';
      data.tokens['semantic.space.section'].value = {
        ref: 'foundation.spacing.24',
      };
      await writeFile(path, JSON.stringify(data));
    },
  });
  try {
    await page.goto(isolated.url);
    await expect(
      page.getByRole('region', { name: 'Tokenhibák' }),
    ).toContainText('SCHEMA_INVALID');
    await expect(app(page).locator('style[data-wdf-preview]')).toHaveCount(0);
    await textField(page, 'primitive.color.ink').fill('#252237');
    await expect(
      page.getByRole('region', { name: 'Tokenhibák' }),
    ).toContainText('SPACING_OUT_OF_SCALE');
    await expect(app(page).locator('style[data-wdf-preview]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Spacing', exact: true }).click();
    await textField(page, 'semantic.space.heading').fill('24');
    await expect(page.getByRole('region', { name: 'Tokenhibák' })).toHaveCount(
      0,
    );
    await expect(app(page).locator('style[data-wdf-preview]')).toHaveCount(1);
    await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  } finally {
    await isolated.close();
  }
});

test('M3-B04: loading timeout and reconnect recovery are explicit', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:5176/**', (r) => r.abort());
  await page.goto('/');
  await expect(page.locator('.preview-status')).toHaveText(
    /Kapcsolódás|Előnézet betöltése/,
  );
  await expect(
    page
      .getByRole('region', { name: 'Alkalmazás előnézete' })
      .getByRole('alert'),
  ).toContainText('nem kapcsolódott', {
    timeout: 12000,
  });
  await page.unroute('http://127.0.0.1:5176/**');
  await page
    .getByRole('button', { name: 'Előnézet újratöltése', exact: true })
    .click();
  await page.getByRole('button', { name: 'Újratöltés', exact: true }).click();
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await expect(app(page).getByRole('article')).toHaveCount(6);
});

async function interceptReplies(
  page: Page,
  type: 'all' | 'applied',
  enabled: boolean,
) {
  await page.evaluate(
    ({ type, enabled }) => {
      (window as unknown as Record<string, unknown>)['__m3Block'] = enabled
        ? type
        : null;
    },
    { type, enabled },
  );
}
test('M3-B05: lost connection and update acknowledgment timeout preserve session and can reconnect', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.addEventListener(
      'message',
      (event) => {
        const block = (window as unknown as Record<string, unknown>)[
          '__m3Block'
        ];
        if (
          event.origin === 'http://127.0.0.1:5176' &&
          (block === 'all' || block === event.data?.type)
        )
          event.stopImmediatePropagation();
      },
      true,
    );
  });
  await ready(page);
  await interceptReplies(page, 'all', true);
  await expect(page.locator('.preview-status')).toHaveText(
    'Megszakadt kapcsolat',
    { timeout: 11000 },
  );
  await interceptReplies(page, 'all', false);
  await page
    .getByRole('button', { name: 'Újracsatlakozás', exact: true })
    .click();
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await interceptReplies(page, 'applied', true);
  await textField(page, 'primitive.color.accent').fill('#123456');
  await expect(
    page
      .getByRole('region', { name: 'Alkalmazás előnézete' })
      .getByRole('alert'),
  ).toContainText('nem kapott visszaigazolást', { timeout: 12000 });
  await interceptReplies(page, 'applied', false);
  await page
    .getByRole('button', { name: 'Újracsatlakozás', exact: true })
    .click();
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await expect(app(page).locator('.button--primary').first()).toHaveCSS(
    'background-color',
    'rgb(18, 52, 86)',
  );
});

test('M3-B06: Lab keyboard, narrow desktop, panel collapse, native selector, accessibility and real scrolling', async ({
  page,
}) => {
  for (const width of [1440, 1024, 760, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.screenshot({
      path: `docs/reports/evidence/m3/lab-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole('button', { name: 'Beállítások', exact: true }).click();
  await expect(page.getByRole('complementary')).toHaveCount(0);
  await page.getByRole('button', { name: 'Beállítások', exact: true }).click();
  await expect(page.getByRole('complementary')).toBeVisible();
  const select = page.getByLabel('Értékek hatóköre');
  await select.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toHaveValue('tablet');
  await page.getByRole('button', { name: 'Spacing', exact: true }).click();
  await expect(field(page, 'semantic.space.page')).toBeVisible();
  await page.getByLabel('Értékek hatóköre').selectOption('');
  await page.getByText('Foundation · LOCKED', { exact: true }).click();
  await expect(page.locator('.foundation')).toContainText(
    'foundation.card.spacious',
  );
  await expect(page.locator('.foundation input')).toHaveCount(0);
  await page.getByRole('button', { name: '320 CSS px', exact: true }).click();
  const content = await page.locator('iframe').elementHandle();
  const frame = await content!.contentFrame();
  await frame!.evaluate(() => window.scrollTo(0, 500));
  expect(await frame!.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
