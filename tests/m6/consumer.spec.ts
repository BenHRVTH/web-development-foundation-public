import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { typographyReportSchema } from '@wdf/core';
import { archiveTypography } from '../typography-evidence';
import type { ChangeOperation, ChangeView } from '@wdf/core/change';
import { launch } from './installed-lab';
const evidence = 'docs/reports/evidence/m6';
const npmCli: string =
  process.env['npm_execpath'] ??
  (() => {
    throw new Error('Run this tool through its npm run script.');
  })();
const labUrl = 'http://127.0.0.1:5175';
async function state(page: Page): Promise<ChangeView> {
  return page.evaluate(async () => {
    const p = '/@id/__x00__virtual:wdf-project';
    const { connection } = (await import(/* @vite-ignore */ p)).default;
    return (
      await fetch('/__wdf/state', {
        headers: { 'X-WDF-Session': connection.session },
      })
    ).json();
  });
}
async function command(page: Page, operation: ChangeOperation) {
  return page.evaluate(async (operation) => {
    const p = '/@id/__x00__virtual:wdf-project';
    const { connection } = (await import(/* @vite-ignore */ p)).default;
    const headers = {
      'X-WDF-Session': connection.session,
      'Content-Type': 'application/json',
    };
    const view = await (await fetch('/__wdf/state', { headers })).json();
    const response = await fetch('/__wdf/change', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        version: '1.0.0',
        projectId: connection.projectId,
        session: connection.session,
        requestId: crypto.randomUUID(),
        expectedRevision: view.state.revision,
        operation,
      }),
    });
    return { status: response.status, data: await response.json() };
  }, operation);
}
async function open(page: Page) {
  await page.goto(labUrl);
  await expect(page.locator('.preview-status').first()).toHaveText(
    'Élő kapcsolat',
    { timeout: 30000 },
  );
}
async function shot(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  await page.screenshot({
    path: join(evidence, name + '.png'),
    fullPage: !(await page.locator('dialog[open]').count()),
  });
}

test('M6-PACK/E2E: installed artifacts, real consumer, all scopes, persistence, Audit and actual confirmed Approval', async ({
  page,
}, testInfo) => {
  const installed = JSON.parse(
    await readFile('test-results/m6-consumer.json', 'utf8'),
  );
  const root = installed.root;
  let lab = launch(root);
  try {
    await expect
      .poll(() => lab.log(), { timeout: 30000 })
      .toContain('WDF UI Lab');
    await open(page);
    const catalog = await page.evaluate(async () => {
      const p = '/@id/__x00__virtual:wdf-project';
      return (await import(/* @vite-ignore */ p)).default.catalog;
    });
    expect(catalog.diagnostics).toEqual([]);
    expect(catalog.entries).toHaveLength(4);
    expect((await state(page)).state.projectId).toBe('hangar-listening-room');
    expect((await state(page)).state.baseline).toBeNull();
    const source = await readFile(join(root, 'wdf/tokens.json'), 'utf8');
    const website = page.frameLocator('#website-preview');
    await expect(
      website.getByRole('heading', { name: 'Figyeljünk együtt.' }),
    ).toBeVisible();
    await expect(
      website.getByRole('heading', { name: 'Nyitott hallgatószoba' }),
    ).toBeVisible();
    const color = () =>
      website
        .locator('.action-primary')
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(await color()).toBe('rgb(156, 58, 16)');
    expect(
      (
        await command(page, {
          type: 'edit',
          patch: {
            scope: { kind: 'global' },
            changes: { 'primitive.color.accent': '#873314' },
          },
        })
      ).status,
    ).toBe(200);
    await expect.poll(color).toBe('rgb(135, 51, 20)');
    expect(await readFile(join(root, 'wdf/tokens.json'), 'utf8')).toBe(source);
    expect(
      (
        await command(page, {
          type: 'edit',
          patch: {
            scope: { kind: 'family', family: 'action' },
            changes: { 'component.action.radius': 16 },
          },
        })
      ).status,
    ).toBe(200);
    await expect
      .poll(() =>
        website
          .locator('.action-primary')
          .first()
          .evaluate((e) => getComputedStyle(e).borderRadius),
      )
      .toBe('16px');
    expect(
      (
        await command(page, {
          type: 'edit',
          patch: {
            scope: { kind: 'variant', family: 'action', variant: 'secondary' },
            changes: { 'component.action.secondary.background': '#244b68' },
          },
        })
      ).status,
    ).toBe(200);
    const saved = await state(page);
    expect((await command(page, { type: 'undo' })).status).toBe(200);
    expect((await command(page, { type: 'redo' })).status).toBe(200);
    expect((await state(page)).state.draft).toEqual(saved.state.draft);
    await page
      .getByRole('button', { name: 'A · Referencia', exact: true })
      .click();
    await expect.poll(color).toBe('rgb(156, 58, 16)');
    await shot(page, 'consumer-reference');
    await page.getByRole('button', { name: /Draft.*B|B.*Draft/ }).click();
    await expect.poll(color).toBe('rgb(135, 51, 20)');
    await lab.close();
    lab = launch(root);
    await expect
      .poll(() => lab.log(), { timeout: 30000 })
      .toContain('WDF UI Lab');
    await open(page);
    expect((await state(page)).state.draft).toEqual(saved.state.draft);
    await expect.poll(color).toBe('rgb(135, 51, 20)');
    await page
      .getByRole('button', { name: 'Component Studio', exact: true })
      .click();
    await expect(page.locator('.preview-status').last()).toHaveText(
      'Élő kapcsolat',
      { timeout: 20000 },
    );
    const studio = page.frameLocator('#studio-preview');
    await expect(studio.locator('.studio-specimen')).toBeVisible();
    await shot(page, 'consumer-studio');
    await page
      .getByRole('button', { name: 'Website View', exact: true })
      .click();
    await website
      .getByRole('button', { name: 'Helyet kérek', exact: true })
      .first()
      .click();
    await expect(website.getByRole('dialog')).toBeVisible();
    await website
      .getByRole('button', { name: 'Foglalás megerősítése', exact: true })
      .click();
    await expect(
      website.getByRole('textbox', { name: 'Neved' }),
    ).toHaveAttribute('aria-invalid', 'true');
    await website
      .getByRole('textbox', { name: 'Neved' })
      .fill('Árvíztűrő Őrség');
    await website
      .getByRole('button', { name: 'Foglalás megerősítése', exact: true })
      .click();
    await expect(website.getByRole('status')).toHaveText(
      'Helyed rögzítve, Árvíztűrő Őrség.',
    );
    const auditToggle = page.getByRole('button', { name: /^Review/ });
    if ((await auditToggle.getAttribute('aria-expanded')) === 'false')
      await auditToggle.click();
    await expect(
      page.getByRole('button', { name: 'Audit', exact: true }),
    ).toBeVisible();
    expect(
      (await command(page, { type: 'qa', level: 'approval' })).status,
    ).toBe(200);
    await expect
      .poll(async () => (await state(page)).state.qa?.running, {
        timeout: 620000,
        intervals: [1000, 2000],
      })
      .toBe(false);
    const qa = (await state(page)).state.qa!;
    expect(
      qa.status,
      JSON.stringify(qa.checks.filter((c) => c.status !== 'PASS')),
    ).toBe('PASS');
    expect(qa.checks).toHaveLength(7);
    await archiveTypography(
      typographyReportSchema.parse(
        JSON.parse(
          qa.checks.find((c) => c.ruleId === 'WDF-TYPE-001')!.evidence[0]!,
        ),
      ),
      'test-results/m6-consumer-typography-approval',
    );
    expect(qa.checks.every((c) => c.status === 'PASS')).toBe(true);
    expect(
      qa.checks.find((c) => c.ruleId === 'WDF-GEOMETRY')?.evidence,
    ).toHaveLength(100);
    await testInfo.attach('consumer-approval-qa', {
      body: JSON.stringify(qa),
      contentType: 'application/json',
    });
    await writeFile(
      'test-results/m6-consumer-approval.json',
      JSON.stringify(qa, null, 2) + '\n',
    );
    // Use the product's separate confirmation; the test is an isolated fixture user.
    await page.getByRole('button', { name: 'Changes', exact: true }).click();
    await page
      .getByRole('button', { name: 'Draft jóváhagyása…', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await shot(page, 'consumer-approve-confirmation');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Jóváhagy/ })
      .click();
    await expect
      .poll(async () => !!(await state(page)).state.baseline, {
        timeout: 30000,
      })
      .toBe(true);
    expect(
      JSON.parse(await readFile(join(root, 'wdf/tokens.json'), 'utf8')).tokens[
        'primitive.color.accent'
      ].value,
    ).toBe('#873314');
    await shot(page, 'consumer-approved');
    const build = spawn(process.execPath, [npmCli, 'run', 'check:generated'], {
      cwd: root,
      stdio: 'pipe',
    });
    expect(await new Promise((resolve) => build.once('exit', resolve))).toBe(0);
    const production = spawn(process.execPath, [npmCli, 'run', 'build'], {
      cwd: root,
      stdio: 'pipe',
    });
    expect(
      await new Promise((resolve) => production.once('exit', resolve)),
    ).toBe(0);
    const hook = spawn(process.execPath, [npmCli, 'run', 'qa:browser'], {
      cwd: root,
      stdio: 'pipe',
    });
    expect(await new Promise((resolve) => hook.once('exit', resolve))).toBe(0);
    await writeFile(
      'test-results/m6-consumer-hook.json',
      await readFile(join(root, 'qa-browser-results.json'), 'utf8'),
    );
  } finally {
    await writeFile('test-results/m6-consumer-lab.log', lab.log());
    await lab.close();
  }
});

test('M6 consumer: five widths/states, geometry, typography, focus, modal, hover, reduced motion and 200% reflow', async ({
  page,
}, testInfo) => {
  const { root } = JSON.parse(
    await readFile('test-results/m6-consumer.json', 'utf8'),
  );
  // Use the installed app's actual standalone Vite server.
  const server = spawn(
    process.execPath,
    [
      join(root, 'node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '5183',
      '--strictPort',
    ],
    { cwd: root, stdio: 'pipe' },
  );
  const rows = [];
  try {
    await expect
      .poll(
        async () => {
          try {
            return (await fetch('http://127.0.0.1:5183')).status;
          } catch {
            return 0;
          }
        },
        { timeout: 30000 },
      )
      .toBe(200);
    for (const width of [320, 390, 768, 1024, 1440])
      for (const state of ['normal', 'empty', 'long', 'error', 'missing']) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`http://127.0.0.1:5183/?state=${state}`);
        await page
          .getByRole('heading', { name: 'Figyeljünk együtt.', exact: true })
          .waitFor();
        await page.evaluate(() => document.fonts.ready);
        const metrics = await page.evaluate(() => {
          const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
          return {
            width: innerWidth,
            overflow: document.documentElement.scrollWidth > innerWidth,
            duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
            cards: [...document.querySelectorAll('.session')].map((e) => ({
              class: e.className,
              padding: parseFloat(getComputedStyle(e).paddingLeft),
              inset:
                e.firstElementChild!.getBoundingClientRect().left -
                e.getBoundingClientRect().left -
                parseFloat(getComputedStyle(e).borderLeftWidth),
            })),
            h1: parseFloat(
              getComputedStyle(document.querySelector('h1')!).fontSize,
            ),
            body: getComputedStyle(document.body).fontWeight,
          };
        });
        expect(metrics.overflow).toBe(false);
        expect(metrics.duplicates).toEqual([]);
        for (const c of metrics.cards)
          expect(c.padding).toBe(
            c.class.includes('spacious')
              ? 32
              : c.class.includes('compact')
                ? 16
                : 24,
          );
        expect(
          metrics.cards.every((c) => Math.abs(c.inset - c.padding) <= 1),
        ).toBe(true);
        expect(metrics.h1).toBe(width >= 1024 ? 48 : 32);
        const axe = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(axe.violations).toEqual([]);
        rows.push({
          state,
          ...metrics,
          axePasses: axe.passes.length,
          incomplete: axe.incomplete.map((i) => i.id),
        });
        await shot(page, `consumer-${width}-${state}`);
      }
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto('http://127.0.0.1:5183');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await page
      .getByRole('button', { name: 'Helyet kérek', exact: true })
      .first()
      .focus();
    await page.keyboard.press('Enter');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('dialog[open]'),
        ),
      ).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Helyet kérek', exact: true }).first(),
    ).toBeFocused();
    const action = page
      .getByRole('button', { name: 'Helyet kérek', exact: true })
      .first();
    await action.hover();
    expect(
      await action.evaluate((e) => getComputedStyle(e).textDecorationLine),
    ).toBe('underline');
    const alignment = await page.evaluate(() => {
      const action = document.querySelector('.action')!,
        icon = action.querySelector('svg')!.getBoundingClientRect(),
        label = action.querySelector('span')!.getBoundingClientRect();
      return {
        iconCenter: icon.y + icon.height / 2,
        textCenter: label.y + label.height / 2,
      };
    });
    expect(
      Math.abs(alignment.iconCenter - alignment.textCenter),
    ).toBeLessThanOrEqual(1);
    await action.focus();
    expect(
      await action.evaluate((e) => getComputedStyle(e).outlineStyle),
    ).not.toBe('none');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true);
    // 200% CSS root-font enlargement with 640/320 CSS px reflow.
    // This does not execute or replace native browser zoom.
    for (const width of [640, 320]) {
      await page.setViewportSize({ width, height: 450 });
      await page.goto('http://127.0.0.1:5183');
      await page
        .getByRole('heading', { name: 'Figyeljünk együtt.', exact: true })
        .waitFor();
      await page.evaluate(
        () => (document.documentElement.style.fontSize = '200%'),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await shot(page, `consumer-reflow-200-${width}`);
    }
    await testInfo.attach('consumer-geometry', {
      body: JSON.stringify(rows),
      contentType: 'application/json',
    });
    await writeFile(
      'test-results/m6-consumer-geometry.json',
      JSON.stringify(rows, null, 2) + '\n',
    );
  } finally {
    server.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      if (server.exitCode !== null) resolve();
      else server.once('exit', () => resolve());
    });
  }
});
