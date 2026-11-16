import { test, expect } from '../lab-regression';
import type { Page, FrameLocator } from '@playwright/test';
import { PNG } from 'pngjs';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isolatedLab } from '../isolated-lab';
import { componentRegistry } from '../../apps/task-manager/wdf/registry';
const evidence = 'docs/reports/evidence/m4';
const main = (page: Page) =>
  page.locator('main').filter({ visible: true }).first();
const studio = (page: Page) => page.frameLocator('#studio-preview');
const website = (page: Page) => page.frameLocator('#website-preview');
async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await page
    .getByRole('button', { name: 'Component Studio', exact: true })
    .click();
  await ready(page);
}
async function ready(page: Page) {
  await expect(main(page).locator('.preview-status')).toHaveText(
    'Élő kapcsolat',
  );
}
async function component(page: Page, id: string) {
  const entry = componentRegistry.find((e) => e.id === id)!;
  await page
    .getByRole('button', {
      name: `${entry.name} ${entry.fixtures.length} fixture`,
      exact: true,
    })
    .click();
  await ready(page);
  await expect(
    studio(page).locator('[data-component]').first(),
  ).toHaveAttribute('data-component', id);
}
async function fixture(page: Page, id: string) {
  await main(page)
    .getByRole('combobox', { name: 'Fixture', exact: true })
    .selectOption(id);
  await ready(page);
  await expect(studio(page).locator('[data-fixture]').first()).toHaveAttribute(
    'data-fixture',
    id,
  );
}
async function shot(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
}
async function geometry(frame: FrameLocator) {
  return frame.locator('body').evaluate((body) => {
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
    return {
      innerWidth: window.innerWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
      width: body.clientWidth,
    };
  });
}
for (const width of [320, 390, 768, 1024, 1440])
  test(`M4-T07/R02/R03/R07/R08: seven components, 27 fixtures, geometry at ${width}px`, async ({
    page,
  }) => {
    const measurements: unknown[] = [];
    await open(page);
    await main(page)
      .getByRole('button', { name: `${width} CSS px`, exact: true })
      .click();
    for (const entry of componentRegistry) {
      await component(page, entry.id);
      for (const f of entry.fixtures) {
        await fixture(page, f.id);
        const frame = studio(page);
        await expect(frame.locator('.studio-specimen')).toContainText(
          entry.name,
        );
        const rect = await page.locator('#studio-preview').boundingBox();
        expect(rect).not.toBeNull();
        expect(rect!.x % 1).toBe(0);
        expect(rect!.y % 1).toBe(0);
        expect(rect!.width).toBe(width);
        expect(rect!.height).toBe(900);
        const metrics = await geometry(frame);
        measurements.push({ component: entry.id, fixture: f.id, ...metrics });
        expect(metrics.innerWidth).toBe(width);
        expect(metrics.duplicates).toEqual([]);
        expect(metrics.overflow).toBe(false);
        await expect(frame.getByRole('alert')).toHaveCount(0);
        if (entry.id === 'task-card') {
          const card = frame.locator('.task-card');
          const padding =
            f.variant === 'compact'
              ? 16
              : f.variant === 'comfortable'
                ? 24
                : 32;
          const measured = await card.evaluate((el) => {
            const style = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const first = el
              .querySelector('.task-card__meta')!
              .getBoundingClientRect();
            return {
              padding: parseFloat(style.paddingLeft),
              inset: first.left - rect.left - parseFloat(style.borderLeftWidth),
            };
          });
          measurements[measurements.length - 1] = {
            component: entry.id,
            fixture: f.id,
            ...metrics,
            ...measured,
          };
          expect(measured.padding).toBe(padding);
          expect(measured.inset).toBe(padding);
        }
      }
    }
    await mkdir('test-results/m4', { recursive: true });
    await writeFile(
      `test-results/m4/geometry-${width}.json`,
      JSON.stringify(measurements, null, 2),
    );
  });
test('M4-T06/C05: shared state roundtrip, global, family and isolated variant edits affect every matching app occurrence', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat');
  await website(page).getByRole('checkbox').first().check();
  await page
    .locator('[data-token="primitive.color.accent"] input:not([type="color"])')
    .fill('#123456');
  await expect(website(page).locator('.button--primary').first()).toHaveCSS(
    'background-color',
    'rgb(18, 52, 86)',
  );
  await page
    .getByRole('button', { name: 'Component Studio', exact: true })
    .click();
  await ready(page);
  await expect(studio(page).locator('.button--primary')).toHaveCSS(
    'background-color',
    'rgb(18, 52, 86)',
  );
  await shot(page, 'family-before');
  await page
    .getByLabel('component.button.radius érték módja')
    .selectOption('value');
  await page.locator('[data-token="component.button.radius"] input').fill('20');
  await expect(studio(page).locator('.button--primary')).toHaveCSS(
    'border-radius',
    '20px',
  );
  await shot(page, 'family-after');
  await main(page)
    .getByRole('button', { name: 'Component Variant', exact: true })
    .click();
  await shot(page, 'variant-before');
  const mode = page.getByLabel(
    'component.button.primary.background érték módja',
  );
  await mode.selectOption('value');
  await page
    .locator(
      '[data-token="component.button.primary.background"] input:not([type="color"])',
    )
    .fill('#276545');
  await expect(studio(page).locator('.button--primary')).toHaveCSS(
    'background-color',
    'rgb(39, 101, 69)',
  );
  await shot(page, 'variant-after');
  await page.getByRole('button', { name: 'Website View', exact: true }).click();
  await expect(main(page).locator('.preview-status')).toHaveText(
    'Élő kapcsolat',
  );
  await expect(website(page).getByRole('checkbox').first()).toBeChecked();
  await expect(website(page).locator('.task-card').first()).toHaveCSS(
    'border-radius',
    '8px',
  );
  await expect(website(page).locator('.button--primary').first()).toHaveCSS(
    'background-color',
    'rgb(39, 101, 69)',
  );
  await expect(website(page).locator('html')).toHaveCSS(
    '--wdf-primitive--color--accent',
    '#123456',
  );
  await website(page)
    .getByRole('button', { name: 'Új feladat', exact: true })
    .click();
  const primaries = website(page).locator('.button--primary');
  expect(await primaries.count()).toBeGreaterThan(1);
  for (const button of await primaries.all()) {
    await expect(button).toHaveCSS('background-color', 'rgb(39, 101, 69)');
    await expect(button).toHaveCSS('border-radius', '20px');
  }
  await expect(
    website(page).locator('.button--secondary').first(),
  ).not.toHaveCSS('background-color', 'rgb(39, 101, 69)');
  await expect(website(page).locator('.button--secondary').first()).toHaveCSS(
    'border-radius',
    '20px',
  );
  await shot(page, 'website-shared-edit');
  await website(page)
    .getByRole('button', { name: 'Bezárás', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Component Studio', exact: true })
    .click();
  await expect(
    page.locator(
      '[data-token="component.button.primary.background"] input:not([type="color"])',
    ),
  ).toHaveValue('#276545');
  // Family edit across every TaskCard, including another app route.
  await component(page, 'task-card');
  await main(page)
    .getByRole('button', { name: 'Component Family', exact: true })
    .click();
  await page
    .getByLabel('component.task-card.radius érték módja')
    .selectOption('value');
  await page
    .locator('[data-token="component.task-card.radius"] input')
    .fill('24');
  await expect(studio(page).locator('.task-card')).toHaveCSS(
    'border-radius',
    '24px',
  );
  await page.getByRole('button', { name: 'Website View', exact: true }).click();
  for (const card of await website(page).locator('.task-card').all())
    await expect(card).toHaveCSS('border-radius', '24px');
  await website(page).locator('.task-card__link').first().click();
  await expect(website(page).locator('.task-detail')).toHaveCSS(
    'border-radius',
    '24px',
  );
});
test('M4-R09: genuine hover, focus, disabled, busy, error, controlled input/select/checkbox and modal recovery', async ({
  page,
}) => {
  await open(page);
  const primary = studio(page).locator('.button--primary');
  await primary.hover();
  await expect(primary).not.toHaveCSS('background-color', 'rgb(91, 60, 180)');
  await primary.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(primary).toBeFocused();
  await expect(primary).toHaveCSS('outline-style', 'solid');
  await shot(page, 'button-focus');
  await primary.click();
  await expect(studio(page).getByRole('status')).toHaveText('Aktiválások: 1');
  await fixture(page, 'disabled');
  await expect(studio(page).locator('button')).toBeDisabled();
  await fixture(page, 'busy');
  await expect(studio(page).locator('button')).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await shot(page, 'button-busy');
  await fixture(page, 'long');
  await shot(page, 'button-long');
  await component(page, 'text-input');
  await studio(page).getByRole('textbox').fill('Valódi szövegmódosítás');
  await expect(studio(page).getByRole('textbox')).toHaveValue(
    'Valódi szövegmódosítás',
  );
  await fixture(page, 'error');
  await expect(studio(page).getByRole('textbox')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await shot(page, 'input-error');
  await component(page, 'select');
  await studio(page).getByRole('combobox').selectOption('completed');
  await expect(studio(page).getByRole('combobox')).toHaveValue('completed');
  await studio(page).getByRole('combobox').focus();
  await studio(page).getByRole('combobox').press('Alt+ArrowDown');
  await shot(page, 'native-select-keyboard');
  await studio(page).getByRole('combobox').press('Escape');
  await component(page, 'checkbox');
  await studio(page).getByRole('checkbox').press('Space');
  await expect(studio(page).getByRole('checkbox')).toBeChecked();
  await component(page, 'task-card');
  await studio(page).getByRole('checkbox').check();
  await expect(studio(page).locator('.status-badge')).toContainText('Kész');
  await component(page, 'dialog');
  await expect(studio(page).getByRole('dialog')).toBeVisible();
  await studio(page)
    .getByRole('button', { name: 'Bezárás', exact: true })
    .press('Escape');
  await expect(studio(page).getByRole('dialog')).not.toBeVisible();
  await studio(page)
    .getByRole('button', { name: 'Dialógus megnyitása', exact: true })
    .click();
  await expect(studio(page).getByRole('dialog')).toBeVisible();
  await fixture(page, 'long');
  await shot(page, 'dialog-long');
});
test('M4-C04: invalid props and render exceptions stay local and other fixtures/workspaces recover', async ({
  page,
}) => {
  await page.route('**/wdf/registry.ts', async (route) => {
    const headers = { ...route.request().headers() };
    delete headers['if-none-match'];
    delete headers['if-modified-since'];
    const response = await route.fetch({ headers });
    const body = await response.text();
    expect(body).toContain('children: "Új feladat"');
    await route.fulfill({
      response,
      body: body.replace('children: "Új feladat"', 'children: 12'),
    });
  });
  await open(page);
  await expect(studio(page).getByRole('alert')).toContainText(
    'REGISTRY_PROPS_INVALID',
  );
  await expect(studio(page).getByRole('alert')).toContainText(
    'fixtures["primary"].props["children"]',
  );
  await shot(page, 'invalid-fixture');
  await fixture(page, 'secondary');
  await expect(studio(page).locator('.button--secondary')).toBeVisible();
  await component(page, 'task-card');
  await expect(studio(page).locator('.task-card')).toBeVisible();
  await page.unroute('**/wdf/registry.ts');
  await page.route('**/src/components/Button.tsx', async (route) => {
    const headers = { ...route.request().headers() };
    delete headers['if-none-match'];
    delete headers['if-modified-since'];
    const response = await route.fetch({ headers });
    const body = await response.text();
    expect(body).toContain('return');
    const patched = body.replace(
      /(function Button\([\s\S]*?\) \{)/,
      '$1\n if (children === "Új feladat") throw new Error("M4_RENDER_FAILURE");',
    );
    expect(patched).not.toBe(body);
    await route.fulfill({ response, body: patched });
  });
  await component(page, 'button');
  await expect(studio(page).getByRole('alert').first()).toContainText(
    'button / primary',
  );
  await expect(studio(page).getByRole('alert').last()).toContainText(
    'M4_RENDER_FAILURE',
  );
  await ready(page);
  await shot(page, 'render-failure');
  await fixture(page, 'secondary');
  await expect(studio(page).locator('.button--secondary')).toBeVisible();
  await page.unroute('**/src/components/Button.tsx');
  await page.getByRole('button', { name: 'Website View', exact: true }).click();
  await expect(website(page).getByRole('article')).toHaveCount(6);
});
test('M4-UX: variant comparisons, narrow desktops, keyboard, no layout overflow, accessible chrome and visual evidence', async ({
  page,
}) => {
  await open(page);
  await shot(page, 'studio-1440');
  await main(page)
    .getByRole('button', { name: 'Összes variáns', exact: true })
    .click();
  await expect(studio(page).locator('.studio-specimen')).toHaveCount(3);
  await shot(page, 'primitive-variants');
  await component(page, 'task-card');
  await expect(studio(page).locator('.task-card')).toHaveCount(3);
  await page.setViewportSize({ width: 1440, height: 1600 });
  await shot(page, 'task-card-comparison');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await component(page, 'dialog');
  await fixture(page, 'long');
  await shot(page, 'composite-long');
  await component(page, 'task-card');
  for (const width of [1024, 760, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await shot(page, `studio-${width}`);
  }
  await page.setViewportSize({ width: 1024, height: 1000 });
  await main(page)
    .getByRole('button', { name: '1440 CSS px', exact: true })
    .click();
  const canvas = main(page).locator('.preview-scroll');
  await canvas.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  expect(await canvas.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(studio(page).locator('body')).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .exclude('#website-preview')
    .exclude('#studio-preview')
    .analyze();
  expect(axe.violations).toEqual([]);
  await main(page)
    .getByRole('button', { name: 'Beállítások', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(main(page).locator('.design-panel')).toHaveCount(0);
});

test('M4-VR01: original fixture pixels match variant comparison and survive live edit/restore', async ({
  page,
}) => {
  const visual: unknown[] = [];
  type Shape = {
    left: number;
    top: number;
    width: number;
    height: number;
    radius: number;
    padding: string;
  };
  async function shape(id: string): Promise<Shape> {
    return studio(page)
      .locator('.studio-specimen')
      .evaluate((section, id) => {
        const element = section.querySelector(
          id === 'button' ? '.button--primary' : '.task-card',
        )!;
        const box = element.getBoundingClientRect(),
          outer = section.getBoundingClientRect(),
          css = getComputedStyle(element);
        return {
          left: box.left - outer.left,
          top: box.top - outer.top,
          width: box.width,
          height: box.height,
          radius: parseFloat(css.borderRadius),
          padding: css.padding,
        };
      }, id);
  }
  function compare(a: Buffer, b: Buffer, box: Shape) {
    const first = PNG.sync.read(a),
      second = PNG.sync.read(b);
    expect([second.width, second.height]).toEqual([first.width, first.height]);
    let pixels = 0,
      maxDelta = 0;
    for (let i = 0; i < first.data.length; i += 4) {
      let changed = false;
      for (let j = 0; j < 4; j++) {
        const delta = Math.abs(first.data[i + j]! - second.data[i + j]!);
        maxDelta = Math.max(maxDelta, delta);
        changed ||= delta !== 0;
      }
      if (changed) {
        pixels++;
        const x = (i / 4) % first.width,
          y = Math.floor(i / 4 / first.width);
        const localX = x - box.left,
          localY = y - box.top;
        // Only the four measured rounded corners may have a one-unit raster difference.
        expect(
          ((localX >= 0 && localX < box.radius) ||
            (localX >= box.width - box.radius && localX < box.width)) &&
            ((localY >= 0 && localY < box.radius) ||
              (localY >= box.height - box.radius && localY < box.height)),
        ).toBe(true);
      }
    }
    return { width: first.width, height: first.height, pixels, maxDelta };
  }
  await open(page);
  for (const id of ['button', 'task-card']) {
    await component(page, id);
    await page.mouse.move(0, 0);
    const beforeShape = await shape(id);
    const before = await studio(page).locator('.studio-specimen').screenshot();
    await mkdir('test-results/m4', { recursive: true });
    await writeFile(`test-results/m4/${id}-before.png`, before);
    await main(page)
      .getByRole('button', { name: 'Összes variáns', exact: true })
      .click();
    await expect(studio(page).locator('.studio-specimen')).toHaveCount(3);
    const compared = compare(
      before,
      await studio(page).locator('.studio-specimen').first().screenshot(),
      beforeShape,
    );
    expect(compared.pixels).toBe(0);
    visual.push({ component: id, kind: 'variant-comparison', ...compared });
    await main(page)
      .getByRole('button', { name: 'Összes variáns', exact: true })
      .click();
    await main(page)
      .getByRole('button', { name: 'Component Family', exact: true })
      .click();
    await page
      .getByLabel(`component.${id}.radius érték módja`)
      .selectOption('value');
    await page
      .locator(`[data-token="component.${id}.radius"] input`)
      .fill('24');
    await expect(
      studio(page).locator(id === 'button' ? '.button--primary' : '.task-card'),
    ).toHaveCSS('border-radius', '24px');
    expect(
      (await studio(page).locator('.studio-specimen').screenshot()).equals(
        before,
      ),
    ).toBe(false);
    await page.locator(`[data-token="component.${id}.radius"] input`).fill('8');
    await expect(
      studio(page).locator(id === 'button' ? '.button--primary' : '.task-card'),
    ).toHaveCSS('border-radius', '8px');
    await page.mouse.move(0, 0);
    const restored = await studio(page)
      .locator('.studio-specimen')
      .screenshot();
    await writeFile(`test-results/m4/${id}-restored.png`, restored);
    const restoredShape = await shape(id);
    expect(restoredShape).toEqual(beforeShape);
    const recovered = compare(before, restored, beforeShape);
    // Chromium rounds clipped 8px card corners by at most 1/255 after stylesheet replacement.
    expect(recovered.maxDelta).toBeLessThanOrEqual(1);
    expect(recovered.pixels).toBeLessThanOrEqual(64);
    visual.push({
      component: id,
      kind: 'restored',
      geometryBefore: beforeShape,
      geometryAfter: restoredShape,
      ...recovered,
    });
    await mkdir(evidence, { recursive: true });
    await writeFile(`${evidence}/vr-${id}-before.png`, before);
    await writeFile(`${evidence}/vr-${id}-restored.png`, restored);
  }
  await writeFile(
    'test-results/m4/visual.json',
    JSON.stringify(visual, null, 2),
  );
});

test('M4-P03: a missing background workspace ACK is visible in Studio; reconnect resends the shared state', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.addEventListener(
      'message',
      (event) => {
        const blocked = (window as unknown as Record<string, unknown>)[
          '__m4Block'
        ];
        const frame = document.getElementById(
          'website-preview',
        ) as HTMLIFrameElement | null;
        if (
          blocked &&
          event.source === frame?.contentWindow &&
          event.origin === 'http://127.0.0.1:5176' &&
          event.data?.type === 'applied'
        )
          event.stopImmediatePropagation();
      },
      true,
    );
  });
  await open(page);
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>)['__m4Block'] = true;
  });
  await page
    .getByLabel('component.button.radius érték módja')
    .selectOption('value');
  await page.locator('[data-token="component.button.radius"] input').fill('16');
  await expect(studio(page).locator('.button--primary')).toHaveCSS(
    'border-radius',
    '16px',
  );
  await expect(main(page).getByRole('alert')).toContainText('Website View:', {
    timeout: 12000,
  });
  await expect(main(page).getByRole('alert')).toContainText('nem igazolt');
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>)['__m4Block'] = false;
  });
  await page
    .getByRole('button', {
      name: 'Website View újracsatlakoztatása',
      exact: true,
    })
    .click();
  await expect(main(page).getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Website View', exact: true }).click();
  await expect(website(page).locator('.button--primary').first()).toHaveCSS(
    'border-radius',
    '16px',
  );
});

test('M4-N03: component and global repairs share one invalid candidate; no partial CSS reaches either frame', async ({
  page,
}) => {
  const isolated = await isolatedLab({
    port: 5198,
    configure: async (root) => {
      const path = join(root, 'wdf/tokens.json');
      const data = JSON.parse(await readFile(path, 'utf8'));
      data.tokens['primitive.color.ink'].value = 'invalid';
      data.tokens['component.button.radius'].value = -1;
      await writeFile(path, JSON.stringify(data));
    },
  });
  try {
    await page.goto(isolated.url);
    await expect(
      page.getByRole('region', { name: 'Tokenhibák' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Component Studio', exact: true })
      .click();
    await expect(main(page).getByRole('alert')).toContainText(
      'konfiguráció hibás',
    );
    const field = page.locator('[data-token="component.button.radius"] input');
    await expect(field).toHaveValue('-1');
    await field.fill('16');
    await expect(studio(page).locator('style[data-wdf-preview]')).toHaveCount(
      0,
    );
    await expect(studio(page).locator('.button--primary')).toHaveCSS(
      'border-radius',
      '8px',
    );
    await page
      .getByRole('button', { name: 'Website View', exact: true })
      .click();
    await page
      .locator('[data-token="primitive.color.ink"] input:not([type="color"])')
      .fill('#252237');
    await expect(website(page).locator('style[data-wdf-preview]')).toHaveCount(
      1,
    );
    await expect(website(page).locator('.button--primary').first()).toHaveCSS(
      'border-radius',
      '16px',
    );
    await page
      .getByRole('button', { name: 'Component Studio', exact: true })
      .click();
    await expect(studio(page).locator('.button--primary')).toHaveCSS(
      'border-radius',
      '16px',
    );
    await expect(main(page).getByRole('alert')).toHaveCount(0);
  } finally {
    await isolated.close();
  }
});
