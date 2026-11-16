import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { longTask } from '../../apps/task-manager/src/tasks/model';
async function scan(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  return {
    axeVersion: result.testEngine.version,
    violations: result.violations,
  };
}
async function geometry(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const ids = [...document.querySelectorAll('[id]')].map(
      (element) => element.id,
    );
    const card = document.querySelector('.task-card');
    const meta = card?.querySelector('.task-card__meta');
    const checkbox = card?.querySelector('.checkbox');
    const outer = card?.getBoundingClientRect(),
      inner = meta?.getBoundingClientRect(),
      check = checkbox?.getBoundingClientRect();
    const border = card
      ? parseFloat(getComputedStyle(card).borderLeftWidth)
      : 0;
    const button = document.querySelector('.page-heading .button');
    const icon = button?.querySelector('svg')?.getBoundingClientRect(),
      text = button
        ?.querySelector(':scope > span:last-child')
        ?.getBoundingClientRect();
    const detail = document.querySelector('.task-detail');
    const detailOuter = detail?.getBoundingClientRect(),
      detailInner = detail
        ?.querySelector('.task-detail__meta')
        ?.getBoundingClientRect();
    const detailBorder = detail
      ? parseFloat(getComputedStyle(detail).borderLeftWidth)
      : 0;
    const dialog = document.querySelector('dialog[open]');
    const modal = dialog?.getBoundingClientRect();
    return {
      width: root.clientWidth,
      scrollWidth: root.scrollWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      cardInset:
        outer && inner && check
          ? {
              top: inner.top - outer.top - border,
              left: inner.left - outer.left - border,
              right: outer.right - check.right - border,
            }
          : null,
      detailInset:
        detailOuter && detailInner
          ? {
              top: detailInner.top - detailOuter.top - detailBorder,
              left: detailInner.left - detailOuter.left - detailBorder,
              right: detailOuter.right - detailInner.right - detailBorder,
            }
          : null,
      buttonHeight: button?.getBoundingClientRect().height,
      iconCenterDelta:
        icon && text
          ? Math.abs(icon.top + icon.height / 2 - text.top - text.height / 2)
          : null,
      headingSize: getComputedStyle(document.querySelector('h1')!).fontSize,
      headingWeight: getComputedStyle(document.querySelector('h1')!).fontWeight,
      bodyWeight: getComputedStyle(document.body).fontWeight,
      modal: modal
        ? {
            top: modal.top,
            bottom: modal.bottom,
            left: modal.left,
            right: modal.right,
            clientHeight: dialog!.clientHeight,
            scrollHeight: dialog!.scrollHeight,
          }
        : null,
      scrollbar: getComputedStyle(root).scrollbarColor,
    };
  });
}
test('M2-F03: create, validate, detail, edit, completion, undo, filters, history and reset', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('article')).toHaveCount(6);
  await page
    .getByRole('combobox', { name: 'Állapot' })
    .selectOption('completed');
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('button', { name: 'Új feladat', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const title = dialog.getByRole('textbox', { name: /Feladat neve/ });
  await expect(title).toBeFocused();
  await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await expect(title).toBeFocused();
  await title.fill('  Új feladat tesztje  ');
  await dialog
    .getByRole('textbox', { name: 'Leírás', exact: true })
    .fill('Megmaradó részletek.');
  await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveValue('all');
  await expect(page.getByRole('article')).toHaveCount(7);
  await expect(page.getByRole('status')).toContainText(
    'Az új feladat létrejött.',
  );
  await page
    .getByRole('link', { name: 'Új feladat tesztje', exact: true })
    .click();
  await expect(page).toHaveURL(/#tasks\/task-007$/);
  await expect(page).toHaveTitle('Új feladat tesztje · Lépés');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByRole('article')).toContainText('Megmaradó részletek.');
  await page.getByRole('checkbox', { name: 'Elkészült a feladat' }).check();
  await expect(page.getByRole('article')).toContainText('Kész');
  await page.getByRole('checkbox').uncheck();
  await expect(page.getByRole('article')).toContainText('Nyitott');
  await page.getByRole('button', { name: 'Szerkesztés', exact: true }).click();
  await expect(title).toHaveValue('Új feladat tesztje');
  await expect(
    dialog.getByRole('textbox', { name: 'Leírás', exact: true }),
  ).toHaveValue('Megmaradó részletek.');
  await title.fill('Módosított feladat');
  await dialog.getByRole('checkbox', { name: 'Már elkészült' }).check();
  await dialog.getByRole('button', { name: 'Módosítások mentése' }).click();
  await expect(page).toHaveURL(/#tasks$/);
  await expect(page.getByRole('status')).toContainText('A módosítások mentve.');
  await page.getByRole('combobox').selectOption('completed');
  await expect(page.getByRole('article')).toHaveCount(3);
  await page
    .getByRole('link', { name: 'Módosított feladat', exact: true })
    .click();
  await page.getByRole('link', { name: 'Vissza a feladatokhoz' }).click();
  await expect(page.getByRole('combobox')).toHaveValue('completed');
  await page.goBack();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Módosított feladat' }),
  ).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('combobox')).toHaveValue('completed');
  await page
    .getByRole('checkbox', {
      name: 'Teljesítés visszavonása: Módosított feladat',
    })
    .click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(6);
  await expect(
    page.getByRole('link', { name: 'Módosított feladat', exact: true }),
  ).toHaveCount(0);
});
test('M2-F04: native modal traps focus, Escape restores focus and dirty cancellation preserves input', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Új feladat', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Bezárás', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Feladat létrehozása' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: 'Bezárás', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  const title = dialog.getByRole('textbox', { name: /Feladat neve/ });
  await title.fill('Megőrzendő tartalom');
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('alert')).toContainText('Elveted');
  await expect(
    dialog.getByRole('button', { name: 'Folytatom a szerkesztést' }),
  ).toBeFocused();
  await dialog
    .getByRole('button', { name: 'Folytatom a szerkesztést' })
    .click();
  await expect(title).toHaveValue('Megőrzendő tartalom');
  await expect(title).toBeFocused();
  await dialog.getByRole('button', { name: 'Mégse', exact: true }).click();
  await dialog.getByRole('button', { name: 'Módosítások elvetése' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('article')).toHaveCount(6);
});
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`M2-R${width}: actual app normal, validation, long detail, empty and missing states at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const normal = await geometry(page);
    expect(normal.scrollWidth).toBeLessThanOrEqual(normal.width);
    expect(normal.duplicateIds).toEqual([]);
    expect(normal.cardInset).toEqual({ top: 24, left: 24, right: 24 });
    expect(normal.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(normal.iconCenterDelta).toBeLessThanOrEqual(1);
    expect(Number(normal.headingWeight)).toBeGreaterThan(
      Number(normal.bodyWeight),
    );
    expect(normal.scrollbar).not.toBe('auto');
    const normalAxe = await scan(page);
    const prefix = `docs/reports/evidence/m2/${info.project.name}-${width}`;
    await page.screenshot({ path: `${prefix}-normal.png`, fullPage: true });
    await page.getByRole('button', { name: 'Új feladat', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
    const error = await geometry(page);
    expect(error.modal!.left).toBeGreaterThanOrEqual(0);
    expect(error.modal!.right).toBeLessThanOrEqual(width);
    expect(error.modal!.top).toBeGreaterThanOrEqual(0);
    expect(error.modal!.bottom).toBeLessThanOrEqual(900);
    const errorAxe = await scan(page);
    await page.screenshot({ path: `${prefix}-error.png`, fullPage: false });
    const title = dialog.getByRole('textbox', { name: /Feladat neve/ });
    const description = dialog.getByRole('textbox', {
      name: 'Leírás',
      exact: true,
    });
    await title.fill('x'.repeat(161));
    await description.fill('y'.repeat(4001));
    await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
    await expect(
      dialog.getByText('A cím legfeljebb 160 karakter lehet. Rövidítsd le.'),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        'A leírás legfeljebb 4000 karakter lehet. Rövidítsd le.',
      ),
    ).toBeVisible();
    await expect(title).toBeFocused();
    await title.fill(longTask.title);
    await description.fill(longTask.description);
    await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
    await page.getByRole('link', { name: longTask.title, exact: true }).click();
    // Hash navigation commits on its native event; wait for the destination surface.
    await expect(page.locator('.task-detail')).toContainText(
      longTask.description,
    );
    const long = await geometry(page);
    expect(long.scrollWidth).toBeLessThanOrEqual(long.width);
    expect(long.detailInset).toEqual({ top: 32, left: 32, right: 32 });
    const longAxe = await scan(page);
    await page.screenshot({ path: `${prefix}-long.png`, fullPage: true });
    await page.getByRole('link', { name: 'Vissza a feladatokhoz' }).click();
    await page.getByRole('combobox').selectOption('open');
    while (await page.getByRole('checkbox').count())
      await page.getByRole('checkbox').first().click();
    await expect(
      page.getByRole('heading', { name: 'Minden feladat elkészült' }),
    ).toBeVisible();
    const emptyAxe = await scan(page);
    await page.screenshot({ path: `${prefix}-empty.png`, fullPage: true });
    await page
      .getByRole('button', { name: 'Minden feladat megjelenítése' })
      .click();
    await expect(page.getByRole('article')).toHaveCount(7);
    await page.goto('/#tasks/missing');
    await expect(page.getByRole('alert')).toContainText(
      'A feladat nem található',
    );
    await expect(page).toHaveTitle('A feladat nem található · Lépés');
    await scan(page);
    await page.screenshot({ path: `${prefix}-missing.png`, fullPage: true });
    await page.getByRole('link', { name: 'Megnyitom a feladatlistát' }).click();
    await expect(page.getByRole('article')).toHaveCount(7);
    await info.attach('M2-rendered-evidence', {
      body: JSON.stringify({
        width,
        normal,
        error,
        long,
        accessibility: { normalAxe, errorAxe, longAxe, emptyAxe },
      }),
      contentType: 'application/json',
    });
  });
}
test('M2-N01: isolated negative checks detect duplicate IDs, low contrast and mobile overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  await page.evaluate(() => {
    const first = document.createElement('div');
    first.id = 'negative-duplicate';
    const second = document.createElement('div');
    second.id = first.id;
    const contrast = document.createElement('p');
    contrast.textContent = 'Szándékos teszthiba';
    contrast.style.cssText = 'color:#eeeeee;background:#ffffff';
    const overflow = document.createElement('div');
    overflow.style.width = '1000px';
    overflow.textContent = 'Overflow test';
    document.body.append(first, second, contrast, overflow);
  });
  const result = await geometry(page);
  expect(result.duplicateIds).toContain('negative-duplicate');
  expect(result.scrollWidth).toBeGreaterThan(result.width);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.some((item) => item.id === 'color-contrast')).toBe(
    true,
  );
});
test('M2-R11: short mobile modal, error label association, duplicate submit and reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Új feladat', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const title = dialog.getByRole('textbox', { name: /Feladat neve/ });
  await dialog.getByText('Feladat neve', { exact: false }).first().click();
  await expect(title).toBeFocused();
  await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
  const helpId = await title.getAttribute('aria-describedby');
  expect(helpId).toBeTruthy();
  await expect(page.locator(`[id="${helpId}"]`)).toContainText(
    'Adj nevet a feladatnak.',
  );
  await expect(title).toBeInViewport();
  await title.fill('Egyszer létrehozott feladat');
  // Two synchronous native submit events exercise the form's single-commit guard.
  await dialog.locator('form').evaluate((form) => {
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
  });
  await expect(page.getByRole('article')).toHaveCount(7);
  await expect(
    page.getByRole('link', {
      name: 'Egyszer létrehozott feladat',
      exact: true,
    }),
  ).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(
    await page
      .locator('.button')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.button')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
});
