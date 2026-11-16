import { typographyReportSchema } from '@wdf/core';
import { archiveTypography } from '../typography-evidence';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isolatedLab } from '../isolated-lab';
import type { ChangeOperation, ChangeView } from '@wdf/core/change';
const evidence = 'docs/reports/evidence/m5';
async function shot(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  const modal = (await page.locator('dialog[open]').count()) > 0;
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  if (!modal) {
    await page.evaluate(() => window.scrollTo(0, 0));
    // Paint cross-origin frames before captureBeyondViewport on narrow screens.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: !modal });
  if (!modal) await page.evaluate(({ x, y }) => window.scrollTo(x, y), scroll);
}
async function view(page: Page): Promise<ChangeView> {
  return page.evaluate(async () => {
    const path = '/@id/__x00__virtual:wdf-project';
    const { connection } = (await import(/* @vite-ignore */ path)).default;
    return (
      await fetch('/__wdf/state', {
        headers: { 'X-WDF-Session': connection.session },
      })
    ).json();
  });
}
async function command(page: Page, operation: ChangeOperation) {
  return page.evaluate(async (operation) => {
    const path = '/@id/__x00__virtual:wdf-project';
    const { connection } = (await import(/* @vite-ignore */ path)).default;
    const headers = {
      'X-WDF-Session': connection.session,
      'Content-Type': 'application/json',
    };
    const v = await (await fetch('/__wdf/state', { headers })).json();
    const response = await fetch('/__wdf/change', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        version: '1.0.0',
        projectId: connection.projectId,
        session: connection.session,
        requestId: crypto.randomUUID(),
        expectedRevision: v.state.revision,
        operation,
      }),
    });
    return { status: response.status, data: await response.json() };
  }, operation);
}
async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat', {
    timeout: 20000,
  });
}
async function review(page: Page, tab: 'Audit' | 'Changes' = 'Audit') {
  const toggle = page.getByRole('button', { name: /^Review/ });
  if ((await toggle.getAttribute('aria-expanded')) === 'false')
    await toggle.click();
  await page.getByRole('button', { name: tab, exact: true }).click();
}
async function saved(page: Page) {
  await expect(page.locator('.save-status')).toContainText(
    'Working Draft mentve',
  );
}
const field = (page: Page, id: string) =>
  page.locator(`[data-token="${id}"] input:not([type=color])`);

test('T02/T04/T05/T09/T13: shared Draft, atomic preset/Undo/Redo, A/B without mutation, real restart', async ({
  page,
}) => {
  const lab = await isolatedLab();
  try {
    await open(page, lab.url);
    const initial = await view(page),
      source = await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8');
    expect(initial.state.baseline).toBeNull();
    expect(initial.state.initial.config).toEqual(initial.state.draft);
    const originalSpacing = await page
      .frameLocator('#website-preview')
      .locator('html')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--wdf-semantic--space--page'),
      );
    await page.getByRole('button', { name: 'Spacing', exact: true }).click();
    await page.getByRole('button', { name: 'spacious', exact: true }).click();
    await saved(page);
    const preset = await view(page);
    expect(preset.state.history).toHaveLength(1);
    expect(preset.state.history[0]?.kind).toBe('preset');
    await expect(
      page.frameLocator('#website-preview').locator('html'),
    ).toHaveCSS('--wdf-semantic--space--page', '2rem');
    await review(page, 'Changes');
    await shot(page, 'changes-preset');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await saved(page);
    expect((await view(page)).state.draft).toEqual(initial.state.draft);
    await expect(
      page.frameLocator('#website-preview').locator('html'),
    ).toHaveCSS('--wdf-semantic--space--page', originalSpacing);
    await shot(page, 'undo-preset');
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await saved(page);
    expect((await view(page)).state.draft).toEqual(preset.state.draft);
    await shot(page, 'redo-preset');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await saved(page);
    await page.getByRole('button', { name: 'Colors', exact: true }).click();
    await field(page, 'primitive.color.accent').fill('#126174');
    await expect(
      page.frameLocator('#website-preview').locator('.button--primary').first(),
    ).toHaveCSS('background-color', 'rgb(18, 97, 116)');
    await saved(page);
    await page
      .getByRole('button', { name: 'Component Studio', exact: true })
      .click();
    await expect(page.locator('main:visible .preview-status')).toHaveText(
      'Élő kapcsolat',
    );
    await expect(
      page.frameLocator('#studio-preview').locator('.button--primary').first(),
    ).toHaveCSS('background-color', 'rgb(18, 97, 116)');
    await page
      .getByLabel('component.button.radius érték módja')
      .selectOption('value');
    await page
      .locator('main:visible [data-token="component.button.radius"] input')
      .fill('24');
    await saved(page);
    await expect(
      page.frameLocator('#website-preview').locator('.button--primary').first(),
    ).toHaveCSS('border-radius', '24px');
    await review(page, 'Changes');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await saved(page);
    for (const id of ['website-preview', 'studio-preview'])
      await expect(
        page.frameLocator(`#${id}`).locator('.button--primary').first(),
      ).toHaveCSS('border-radius', '8px');
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await saved(page);
    for (const id of ['website-preview', 'studio-preview'])
      await expect(
        page.frameLocator(`#${id}`).locator('.button--primary').first(),
      ).toHaveCSS('border-radius', '24px');
    await page
      .getByRole('button', { name: 'Website View', exact: true })
      .click();
    const draft = await view(page),
      frame = page
        .frames()
        .find((f) => f.url().startsWith(`http://127.0.0.1:5196`))!;
    const sourceScript = await frame
      .locator('script[src*="src/main"]')
      .getAttribute('src');
    await page
      .getByRole('button', { name: 'A · Referencia', exact: true })
      .click();
    await expect(
      page.frameLocator('#website-preview').locator('.button--primary').first(),
    ).toHaveCSS('background-color', 'rgb(91, 60, 180)');
    expect((await view(page)).state).toEqual(draft.state);
    expect(
      await frame.locator('script[src*="src/main"]').getAttribute('src'),
    ).toBe(sourceScript);
    await shot(page, 'reference-initial');
    await page.getByRole('button', { name: 'B · Draft', exact: true }).click();
    await expect(
      page.frameLocator('#website-preview').locator('.button--primary').first(),
    ).toHaveCSS('background-color', 'rgb(18, 97, 116)');
    expect((await view(page)).state).toEqual(draft.state);
    await shot(page, 'draft-comparison');
    await lab.restart();
    await open(page, lab.url);
    await expect(field(page, 'primitive.color.accent')).toHaveValue('#126174');
    expect((await view(page)).state.initial).toEqual(initial.state.initial);
    expect((await view(page)).state.draft).toEqual(draft.state.draft);
    await review(page, 'Changes');
    await shot(page, 'draft-restored');
    expect(await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8')).toBe(
      source,
    );
  } finally {
    await lab.close();
  }
});

test('T10/T11/T12/C07: real invalid token, separate proposal decisions, navigation and one Undo', async ({
  page,
}) => {
  const lab = await isolatedLab({ invalid: true });
  try {
    await page.goto(lab.url);
    await review(page);
    const initial = await view(page);
    const target = 'semantic.space.heading';
    const finding = page
      .locator('.audit-list > li')
      .filter({ has: page.getByRole('button', { name: target, exact: true }) })
      .first();
    await expect(finding).toContainText('WDF-SPACING-001');
    await finding.getByRole('button', { name: target, exact: true }).click();
    await expect(field(page, target)).toBeFocused();
    await expect(field(page, target)).toHaveValue('19');
    await shot(page, 'invalid-token-and-finding');
    await finding
      .getByRole('button', { name: 'Javaslat elutasítása', exact: true })
      .click();
    await saved(page);
    expect((await view(page)).state.draft).toEqual(initial.state.draft);
    await expect(finding).toContainText('továbbra is blokkol');
    await shot(page, 'proposal-rejected');
    const other = page
      .locator('.audit-list > li')
      .filter({
        has: page.getByRole('button', {
          name: 'semantic.space.section',
          exact: true,
        }),
      })
      .first();
    await other
      .getByRole('button', { name: 'Javítás elfogadása', exact: true })
      .click();
    await saved(page);
    const accepted = await view(page);
    expect(accepted.state.history).toHaveLength(1);
    expect(accepted.state.history[0]?.changes).toHaveLength(1);
    expect(accepted.state.draft.tokens[target]?.value).toBe(19);
    await shot(page, 'proposal-accepted');
    await review(page, 'Changes');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await saved(page);
    expect((await view(page)).state.draft).toEqual(initial.state.draft);
    await shot(page, 'audit-fix-undo');
    await review(page);
    await page
      .getByRole('button', { name: 'Approval QA futtatása', exact: true })
      .click();
    await expect(page.locator('[data-qa-status]')).toHaveAttribute(
      'data-qa-status',
      'NOT_RUN',
    );
    await expect
      .poll(async () => (await view(page)).state.qa?.running)
      .toBe(false);
    await page.reload();
    await review(page);
    await expect(page.locator('.qa-results')).toContainText('FAIL');
    await expect(page.locator('.qa-results')).toContainText('NOT_RUN');
    await page.getByRole('button', { name: 'Typography', exact: true }).click();
    await expect(page.locator('[data-typography-status]')).toHaveAttribute(
      'data-typography-status',
      'NOT_RUN',
    );
    await shot(page, 'qa-failed-invalid-config');
  } finally {
    await lab.close();
  }
});

test('T14/T15: real Approval QA, explicit modal, failed transaction rollback and retry to coherent baseline', async ({
  page,
}, info) => {
  let fault = false;
  const lab = await isolatedLab({
    port: 5197,
    fault: (step) => {
      if (fault && step === 'transaction:css')
        throw new Error('EACCES isolated browser injection');
    },
  });
  try {
    await open(page, lab.url);
    const initial = await view(page),
      source = await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8');
    await field(page, 'primitive.color.accent').fill('#126174');
    await saved(page);
    // Approval must keep the accepted current CSS representative, without a 600→700 repair.
    expect(
      (await view(page)).state.draft.tokens['primitive.weight.medium']?.value,
    ).toBe(600);
    await page.reload();
    await expect(page.locator('.save-status')).toContainText(
      'Working Draft mentve',
    );
    await review(page);
    await page
      .getByRole('button', { name: 'Approval QA futtatása', exact: true })
      .click();
    await expect(page.locator('[data-qa-status]')).toHaveText('QA fut…');
    await shot(page, 'qa-running');
    await expect
      .poll(async () => (await view(page)).state.qa?.running, {
        timeout: 660000,
        intervals: [1000, 2000],
      })
      .toBe(false);
    const qa = await view(page);
    await info.attach('approval-qa', {
      body: JSON.stringify(qa.state.qa, null, 2),
      contentType: 'application/json',
    });
    await archiveTypography(
      typographyReportSchema.parse(
        JSON.parse(
          qa.state.qa!.checks.find((c) => c.ruleId === 'WDF-TYPE-001')!
            .evidence[0]!,
        ),
      ),
      'test-results/m5-typography-approval',
    );
    if (qa.state.qa?.status !== 'PASS')
      console.log(
        'WDF_M5_APPROVAL_FAILURE',
        JSON.stringify(qa.state.qa?.checks.filter((c) => c.status !== 'PASS')),
      );
    expect(qa.state.qa?.status).toBe('PASS');
    expect(qa.state.qa?.checks).toHaveLength(7);
    await expect(page.locator('[data-qa-status]')).toHaveText('PASS', {
      timeout: 5000,
    });
    await shot(page, 'qa-pass');
    await review(page, 'Changes');
    const trigger = page.getByRole('button', {
      name: 'Draft jóváhagyása…',
      exact: true,
    });
    await expect(trigger).toBeEnabled();
    await trigger.click();
    const dialog = page.getByRole('dialog', {
      name: 'Working Draft jóváhagyása',
    });
    await expect(
      dialog.getByRole('button', { name: 'Mégse', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      dialog.getByRole('button', {
        name: 'Jóváhagyás és véglegesítés',
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      dialog.getByRole('button', { name: 'Mégse', exact: true }),
    ).toBeFocused();
    await shot(page, 'approval-confirmation');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    expect((await view(page)).state.baseline).toBeNull();
    await trigger.click();
    fault = true;
    await dialog
      .getByRole('button', { name: 'Jóváhagyás és véglegesítés', exact: true })
      .click();
    await expect(dialog.getByRole('alert')).toContainText(
      'FINALIZE_ROLLED_BACK',
    );
    expect(await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8')).toBe(
      source,
    );
    expect((await view(page)).state.baseline).toBeNull();
    await shot(page, 'finalization-failed');
    await dialog.getByRole('button', { name: 'Mégse', exact: true }).click();
    fault = false;
    await page
      .locator('.change-notice')
      .getByRole('button', { name: 'Mentett Draft visszatöltése' })
      .click();
    await expect(trigger).toBeEnabled();
    await trigger.click();
    await dialog
      .getByRole('button', { name: 'Jóváhagyás és véglegesítés', exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await saved(page);
    const approved = await view(page);
    expect(approved.state.baseline?.config).toEqual(approved.state.draft);
    expect(approved.state.draft.tokens['primitive.weight.medium']?.value).toBe(
      600,
    );
    expect(
      JSON.parse(await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8'))
        .tokens['primitive.weight.medium'].value,
    ).toBe(600);
    expect(approved.state.initial).toEqual(initial.state.initial);
    expect(approved.state.baseline?.approval.run.id).toBe(qa.state.qa?.id);
    const { generateTokens } = await import('@wdf/core/generation');
    const generated = generateTokens(approved.state.draft);
    expect(generated.ok).toBe(true);
    if (generated.ok)
      for (const file of ['tokens.css', 'tokens.ts'])
        expect(
          await readFile(join(lab.root, 'src/generated', file), 'utf8'),
        ).toContain(generated.value.sourceDigest);
    const drift = await promisify(execFile)(process.execPath, [
      resolve('tools/generate-m1.ts'),
      '--project',
      lab.root,
      '--check',
    ]);
    expect(JSON.parse(drift.stdout).status).toBe('PASS');
    await shot(page, 'approved-baseline');
    await page
      .getByRole('button', { name: 'A · Referencia', exact: true })
      .click();
    await expect(page.locator('.preview-caption').first()).toContainText(
      'Approved Baseline',
    );
    await expect(
      page.frameLocator('#website-preview').locator('.button--primary').first(),
    ).toHaveCSS('background-color', 'rgb(18, 97, 116)');
    await shot(page, 'reference-approved');
    await page.goto('about:blank');
    await lab.restart();
    await open(page, lab.url);
    expect((await view(page)).state.baseline?.approval).toEqual(
      approved.state.baseline?.approval,
    );
  } finally {
    await lab.close();
  }
});

test('T16/C08/C09: real source HMR preserves Draft and makes QA/reference stale; token edit invalidates old QA', async ({
  page,
}) => {
  const lab = await isolatedLab();
  try {
    await open(page, lab.url);
    await command(page, {
      type: 'edit',
      patch: {
        scope: { kind: 'family', family: 'button' },
        changes: { 'component.button.radius': 24 },
      },
    });
    expect(
      (await view(page)).state.draft.tokens['primitive.weight.medium']?.value,
    ).toBe(600);
    await page.reload();
    await review(page);
    await page
      .getByRole('button', { name: 'Targeted QA futtatása', exact: true })
      .click();
    await expect
      .poll(async () => (await view(page)).state.qa?.running, {
        timeout: 660000,
        intervals: [1000, 2000],
      })
      .toBe(false);
    const qa = await view(page);
    if (qa.state.qa?.status !== 'PASS')
      console.log(
        'WDF_M5_APPROVAL_FAILURE',
        JSON.stringify(qa.state.qa?.checks.filter((c) => c.status !== 'PASS')),
      );
    expect(qa.state.qa?.status).toBe('PASS');
    const path = join(lab.root, 'src/App.tsx');
    await writeFile(
      path,
      (await readFile(path, 'utf8')) + '\n// external React source update\n',
    );
    await expect(page.locator('.change-notice')).toContainText('React-forrás');
    const changed = await view(page);
    expect(changed.state.draft).toEqual(qa.state.draft);
    expect(changed.state.qa?.status).toBe('STALE');
    await expect(page.locator('[data-qa-status]')).toHaveText('STALE');
    await shot(page, 'qa-stale-source');
    await page
      .getByRole('button', { name: 'A · Referencia', exact: true })
      .click();
    await expect(page.locator('.preview-caption').first()).toContainText(
      'elavult referencia',
    );
    await shot(page, 'reference-stale-current-source');
    await page.getByRole('button', { name: 'B · Draft', exact: true }).click();
    await field(page, 'primitive.color.accent').fill('#126174');
    await saved(page);
    expect((await view(page)).state.qa?.status).toBe('STALE');
    const attempt = await command(page, {
      type: 'approve',
      runId: qa.state.qa!.id,
      configurationDigest: qa.context.configurationDigest,
      confirmed: true,
    });
    expect(attempt.status).toBe(409);
    expect(attempt.data.error).toContain('APPROVAL_QA_REQUIRED');
  } finally {
    await lab.close();
  }
});

test('QA execution failure is visible ERROR and cannot enable approval', async ({
  page,
}) => {
  const lab = await isolatedLab({
    configure: async (root) => {
      const path = join(root, 'src/App.tsx');
      await writeFile(
        path,
        (await readFile(path, 'utf8')).replace(
          'const [tasks,',
          'if (window.location.hash === "#qa-crash") throw new Error("QA_CRASH");\n  const [tasks,',
        ),
      );
    },
  });
  try {
    await open(page, lab.url);
    // A denied browser launch is an environment fault, not a successful empty run.
    const previous = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
    try {
      process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] =
        '/nonexistent/m5-test-browser';
      await review(page);
      await page
        .getByRole('button', { name: 'Approval QA futtatása', exact: true })
        .click();
      await expect
        .poll(async () => (await view(page)).state.qa?.running)
        .toBe(false);
      await expect(page.locator('[data-qa-status]')).toHaveText('ERROR');
      await shot(page, 'qa-error');
    } finally {
      if (previous === undefined)
        delete process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
      else process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] = previous;
    }
  } finally {
    await lab.close();
  }
});

for (const width of [320, 390, 768, 1024, 1440])
  test(`Review responsive/keyboard/a11y and both workspaces at ${width}px`, async ({
    page,
  }) => {
    const lab = await isolatedLab();
    try {
      await page.setViewportSize({ width, height: 1000 });
      await open(page, lab.url);
      await review(page);
      await shot(page, `audit-${width}`);
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
      await review(page, 'Changes');
      await shot(page, `changes-${width}`);
      await page
        .getByRole('button', { name: 'Component Studio', exact: true })
        .click();
      await expect(page.locator('main:visible .preview-status')).toHaveText(
        'Élő kapcsolat',
      );
      await expect(page.locator('.review')).toHaveCount(1);
      await page.getByRole('button', { name: 'Changes', exact: true }).focus();
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
        'BUTTON',
      );
      const toggle = page.getByRole('button', { name: /^Review/ });
      await toggle.click();
      await expect(page.locator('#review-body')).not.toBeVisible();
      await expect(toggle).toBeFocused();
    } finally {
      await lab.close();
    }
  });

test('Local HTTP: missing/wrong session/origin/project, duplicate/stale and arbitrary code/path are rejected', async ({
  page,
  request,
}) => {
  const lab = await isolatedLab();
  try {
    await open(page, lab.url);
    const connection = await page.evaluate(async () => {
      const p = '/@id/__x00__virtual:wdf-project';
      return (await import(/* @vite-ignore */ p)).default.connection;
    });
    expect((await request.get(lab.url + '/__wdf/state')).status()).toBe(403);
    const headers = { 'X-WDF-Session': connection.session, Origin: lab.url };
    const current = await view(page);
    const body = {
      version: '1.0.0',
      projectId: connection.projectId,
      session: connection.session,
      requestId: crypto.randomUUID(),
      expectedRevision: current.state.revision,
      operation: {
        type: 'edit',
        patch: {
          scope: { kind: 'global' },
          changes: { 'primitive.color.accent': '#126174' },
        },
      },
    };
    expect(
      (
        await request.post(lab.url + '/__wdf/change', {
          headers: { ...headers, Origin: 'https://attacker.test' },
          data: body,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post(lab.url + '/__wdf/change', {
          headers,
          data: { ...body, projectId: 'other' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post(lab.url + '/__wdf/change', { headers, data: body })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await request.post(lab.url + '/__wdf/change', { headers, data: body })
      ).status(),
    ).toBe(409);
    expect(
      (
        await request.post(lab.url + '/__wdf/change', {
          headers,
          data: { ...body, requestId: crypto.randomUUID() },
        })
      ).status(),
    ).toBe(409);
    const now = await view(page);
    for (const operation of [
      { type: 'execute', command: 'touch /tmp/m5-injected' },
      { type: 'edit', path: '../../outside' },
      {
        type: 'edit',
        patch: {
          scope: { kind: 'global' },
          changes: { 'foundation.spacing.16': 19 },
        },
      },
    ])
      expect(
        (
          await request.post(lab.url + '/__wdf/change', {
            headers,
            data: {
              ...body,
              requestId: crypto.randomUUID(),
              expectedRevision: now.state.revision,
              operation,
            },
          })
        ).status(),
      ).toBe(409);
    expect((await view(page)).state).toEqual(now.state);
  } finally {
    await lab.close();
  }
});
