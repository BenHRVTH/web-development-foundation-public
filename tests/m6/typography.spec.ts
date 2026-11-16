import { archiveTypography } from '../typography-evidence';
import { test, expect, type Frame, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  resolveTokens,
  unwrap,
  typographyReportSchema,
  type TypographyReport,
} from '@wdf/core';
import { isolatedLab } from '../isolated-lab';
import { launch } from './installed-lab';

test.use({ actionTimeout: 10000 });
const evidence = 'docs/reports/evidence/m6/r05-capabilities';
type Role = {
  id: string;
  selector: string;
  family: string;
  size: string;
  weight: string;
};
const taskRoles: Role[] = [
  {
    id: 'body',
    selector: '.page-intro',
    family: 'semantic.font.body',
    size: 'primitive.size.body',
    weight: 'primitive.weight.regular',
  },
  {
    id: 'display',
    selector: 'h1',
    family: 'semantic.font.display',
    size: 'semantic.size.heading',
    weight: 'primitive.weight.bold',
  },
  {
    id: 'subheading',
    selector: '.progress-panel h2',
    family: 'semantic.font.body',
    size: 'primitive.size.task',
    weight: 'primitive.weight.bold',
  },
  {
    id: 'task-title',
    selector: '.task-card h2 .task-card__link > span',
    family: 'semantic.font.body',
    size: 'primitive.size.task',
    weight: 'primitive.weight.bold',
  },
  {
    id: 'utility',
    selector: '.eyebrow',
    family: 'semantic.font.utility',
    size: 'primitive.size.caption',
    weight: 'primitive.weight.medium',
  },
  {
    id: 'identifier',
    selector: '.task-id',
    family: 'semantic.font.utility',
    size: 'primitive.size.caption',
    weight: 'primitive.weight.regular',
  },
];
taskRoles.push(
  {
    id: 'brand',
    selector: '.brand > span:last-child',
    family: 'semantic.font.body',
    size: 'primitive.size.subheading',
    weight: 'primitive.weight.bold',
  },
  {
    id: 'caption',
    selector: '.brand__subtitle',
    family: 'semantic.font.body',
    size: 'primitive.size.caption',
    weight: 'primitive.weight.regular',
  },
  {
    id: 'action',
    selector: '.page-heading .button--primary',
    family: 'semantic.font.body',
    size: 'primitive.size.small',
    weight: 'primitive.weight.medium',
  },
);
const consumerRoles: Role[] = [
  {
    id: 'body',
    selector: '.intro > p:last-child',
    family: 'primitive.font.body',
    size: 'primitive.size.body',
    weight: 'primitive.weight.body',
  },
  {
    id: 'display',
    selector: 'h1',
    family: 'primitive.font.heading',
    size: 'primitive.size.heading',
    weight: 'primitive.weight.heading',
  },
  {
    id: 'subheading',
    selector: '.session h2',
    family: 'primitive.font.body',
    size: 'primitive.size.subheading',
    weight: 'primitive.weight.heading',
  },
  {
    id: 'utility',
    selector: '.eyebrow',
    family: 'primitive.font.label',
    size: 'primitive.size.label',
    weight: 'primitive.weight.body',
  },
  {
    id: 'time',
    selector: '.session-time',
    family: 'primitive.font.label',
    size: 'primitive.size.label',
    weight: 'primitive.weight.heading',
  },
  {
    id: 'action',
    selector: '.action > span',
    family: 'primitive.font.body',
    size: 'primitive.size.body',
    weight: 'primitive.weight.heading',
  },
];
const families = (value: string) =>
  value
    .toLowerCase()
    .replace(/["']/g, '')
    .split(',')
    .map((s) => s.trim())
    .join(',');
async function platformFonts(frame: Frame, selector: string) {
  let session;
  try {
    try {
      session = await frame.page().context().newCDPSession(frame);
    } catch {
      session = await frame.page().context().newCDPSession(frame.page());
    }
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument', {
      depth: -1,
      pierce: true,
    });
    type Dom = {
      nodeId: number;
      documentURL?: string;
      children?: Dom[];
      contentDocument?: Dom;
    };
    function find(node: Dom): Dom | undefined {
      if (node.documentURL?.split('#')[0] === frame.url().split('#')[0])
        return node;
      for (const child of [
        ...(node.children ?? []),
        ...(node.contentDocument ? [node.contentDocument] : []),
      ]) {
        const result = find(child);
        if (result) return result;
      }
    }
    const document = find(root);
    if (!document) throw new Error('Application frame DOM not exposed by CDP');
    const { nodeId } = await session.send('DOM.querySelector', {
      nodeId: document.nodeId,
      selector,
    });
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', {
      nodeId,
    });
    return {
      faces: fonts as {
        familyName: string;
        postScriptName: string;
        isCustomFont: boolean;
        glyphCount: number;
      }[],
    };
  } catch (error) {
    return { unavailableReason: String(error) };
  } finally {
    await session?.detach();
  }
}
async function capture(frame: Frame, role: Role, name: string) {
  const element = frame.locator(role.selector).first();
  await element.waitFor({ state: 'visible' });
  await element.evaluate(async (el) => {
    const css = getComputedStyle(el);
    await document.fonts.load(
      `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`,
      el.textContent ?? '',
    );
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  const actual = await element.evaluate((el) => {
    const css = getComputedStyle(el),
      range = document.createRange();
    range.selectNodeContents(el);
    return {
      family: css.fontFamily,
      size: parseFloat(css.fontSize),
      weight: Number(css.fontWeight),
      style: css.fontStyle,
      color: css.color,
      letterSpacing: css.letterSpacing,
      text: el.textContent!,
      textWidth: range.getBoundingClientRect().width,
      fontStatus: document.fonts.status,
      fontCheck: document.fonts.check(
        `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`,
        el.textContent ?? '',
      ),
    };
  });
  const usedFonts = await platformFonts(frame, role.selector);
  const path = join(evidence, name + '.png');
  return {
    actual: { ...actual, platformFonts: usedFonts },
    path,
    png: PNG.sync.read(await element.screenshot({ path })),
  };
}
function glyphDifference(a: PNG, b: PNG) {
  const width = Math.max(a.width, b.width),
    height = Math.max(a.height, b.height);
  const background = [a.data[0]!, a.data[1]!, a.data[2]!];
  const pixel = (p: PNG, x: number, y: number, c: number) =>
    x < p.width && y < p.height
      ? p.data[(y * p.width + x) * 4 + c]!
      : background[c]!;
  let changedPixels = 0,
    inkPixels = 0,
    maxChannelDelta = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let delta = 0,
        ink = 0;
      for (let c = 0; c < 3; c++) {
        const av = pixel(a, x, y, c),
          bv = pixel(b, x, y, c);
        delta = Math.max(delta, Math.abs(av - bv));
        ink = Math.max(
          ink,
          Math.abs(av - background[c]!),
          Math.abs(bv - background[c]!),
        );
      }
      if (ink >= 8) inkPixels++;
      if (delta >= 8) changedPixels++;
      maxChannelDelta = Math.max(maxChannelDelta, delta);
    }
  const changedInkRatio = changedPixels / Math.max(inkPixels, 1);
  return {
    changedPixels,
    inkPixels,
    maxChannelDelta,
    changedInkRatio,
    distinct: changedPixels >= 20 && changedInkRatio >= 0.01,
  };
}
async function inspectProject(
  page: Page,
  url: string,
  root: string,
  id: string,
  roles: Role[],
) {
  const source = await readFile(join(root, 'wdf/tokens.json'), 'utf8');
  const resolved = unwrap(resolveTokens(JSON.parse(source)));
  const report = {
    project: id,
    root,
    baseline: [] as object[],
    options: [] as object[],
    comparisons: [] as object[],
    sizes: [] as object[],
    defaultAppearance: [] as object[],
    errors: [] as string[],
    capabilities: null as TypographyReport | null,
    sourceUnchanged: false,
    tokenSourceSha256: createHash('sha256').update(source).digest('hex'),
    appCssSha256: createHash('sha256')
      .update(await readFile(join(root, 'src/app.css')))
      .digest('hex'),
  };
  await page.setViewportSize({ width: 1960, height: 1200 });
  await page.goto(url);
  await expect(page.locator('.preview-status').first()).toHaveText(
    'Élő kapcsolat',
    { timeout: 30000 },
  );
  const frame = (await (await page
    .locator('#website-preview')
    .elementHandle())!.contentFrame())!;
  expect(frame, 'Project application iframe must exist').toBeTruthy();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page
      .getByRole('button', { name: `${width} CSS px`, exact: true })
      .click();
    await expect.poll(() => frame.evaluate(() => innerWidth)).toBe(width);
    const tokens =
      [...resolved.responsive].reverse().find((r) => width >= r.minWidth)
        ?.tokens ?? resolved.base;
    for (const role of roles) {
      const result = await capture(frame, role, `${id}-${width}-${role.id}`);
      const expected = {
        family: String(tokens[role.family]!.value),
        size: Number(tokens[role.size]!.value),
        weight: Number(tokens[role.weight]!.value),
      };
      const valid =
        families(result.actual.family) === families(expected.family) &&
        result.actual.size === expected.size &&
        result.actual.weight === expected.weight &&
        result.actual.fontStatus === 'loaded' &&
        result.actual.fontCheck;
      report.baseline.push({
        width,
        role: role.id,
        tokens: { family: role.family, size: role.size, weight: role.weight },
        expected,
        actual: result.actual,
        status: valid ? 'PASS' : 'FAIL',
        evidence: result.path,
      });
      if (id === 'hangar') {
        const legacy = await frame.addStyleTag({
          content:
            'body{font-size:inherit;font-weight:400}h1,h2{font-weight:700}.action,.field label{font-weight:700}header p,.eyebrow,.footnote{font-weight:400}',
        });
        const previous = PNG.sync.read(
          await frame.locator(role.selector).first().screenshot(),
        );
        const unchanged =
          previous.width === result.png.width &&
          previous.height === result.png.height &&
          previous.data.equals(result.png.data);
        await legacy.evaluate((el) => el.parentNode?.removeChild(el));
        report.defaultAppearance.push({
          width,
          role: role.id,
          status: unchanged ? 'PASS' : 'FAIL',
          differingPixels: unchanged ? 0 : null,
        });
        if (!unchanged)
          report.errors.push(
            `${id}/${width}/${role.id}: default typography changed`,
          );
      }
      if (!valid)
        report.errors.push(
          `${id}/${width}/${role.id}: declared/computed typography mismatch`,
        );
    }
  }
  await page.getByRole('button', { name: '1440 CSS px', exact: true }).click();
  await page.getByRole('button', { name: 'Typography', exact: true }).click();
  const getState = () =>
    page.evaluate(async () => {
      const modulePath = '/@id/__x00__virtual:wdf-project';
      const { connection } = (await import(/* @vite-ignore */ modulePath))
        .default;
      return (
        await fetch('/__wdf/state', {
          headers: { 'X-WDF-Session': connection.session },
        })
      ).json();
    });
  const beforeProbe = (await getState()).state.draft;
  const weightFields = page.locator('[data-token] .field-control select');
  expect(await weightFields.count()).toBeGreaterThan(0);
  await expect(page.locator('[data-typography-status]')).toHaveAttribute(
    'data-typography-status',
    /NOT_RUN|STALE/,
  );
  const qaToggle = page.getByRole('button', { name: /^Review/ });
  if ((await qaToggle.getAttribute('aria-expanded')) === 'false')
    await qaToggle.click();
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  const approvalQa = page.getByRole('button', {
    name: 'Approval QA futtatása',
    exact: true,
  });
  try {
    await expect(approvalQa).toBeEnabled({ timeout: 30000 });
    await approvalQa.click();
  } catch (error) {
    console.log(
      'WDF_R05_STARTUP_DIAGNOSTIC',
      JSON.stringify({
        project: id,
        view: await getState(),
        alerts: await page
          .locator('.review-error,.change-notice')
          .allTextContents(),
      }),
    );
    throw error;
  }
  await expect
    .poll(async () => (await getState()).state.qa?.running, {
      timeout: 660000,
      intervals: [1000, 2000],
    })
    .toBe(false);
  const checked = await getState();
  expect(checked.state.qa.level).toBe('approval');
  const check = checked.state.qa.checks.find(
    (c: { ruleId: string }) => c.ruleId === 'WDF-TYPE-001',
  );
  expect(check, 'R05 must be an actual mandatory QA check').toBeTruthy();
  const capabilities = typographyReportSchema.parse(
    JSON.parse(check.evidence[0]),
  );
  report.capabilities = capabilities;
  // No two advertised options may collapse in any real target or viewport.
  // Supported sets vary with the actual loaded font, never with an OS exception.
  for (const role of capabilities.roles)
    for (const measurement of role.measurements)
      for (const pair of measurement['comparisons'] as {
        weights: number[];
        status: string;
      }[])
        if (pair.weights.every((w) => role.verifiedWeights.includes(w)))
          expect(
            pair.status,
            `${id}/${role.id}/${measurement['width']}/${pair.weights.join('/')}`,
          ).toBe('PASS');
  // Keep completed raw measurements even if a later UI assertion fails.
  await writeFile(
    `test-results/m6-r05-${id}-capabilities.json`,
    JSON.stringify(capabilities, null, 2) + '\n',
  );
  console.log(
    'WDF_R05_CAPABILITIES',
    JSON.stringify({
      project: id,
      status: capabilities.status,
      errors: capabilities.errors,
      roles: capabilities.roles.map(
        ({ id, verifiedWeights, rejectedWeights, errors }) => ({
          id,
          verifiedWeights,
          rejectedWeights,
          errors,
        }),
      ),
    }),
  );
  // API completion and the polling client's rendered completion are separate.
  // Assert the real UI state before inspecting its enabled options.
  try {
    await expect(page.locator('[data-typography-status]')).toHaveAttribute(
      'data-typography-status',
      capabilities.status,
      { timeout: 30000 },
    );
  } catch (error) {
    console.log(
      'WDF_R05_UI_DIAGNOSTIC',
      JSON.stringify({
        project: id,
        view: await getState(),
        alerts: await page
          .locator('.review-error,.change-notice')
          .allTextContents(),
      }),
    );
    throw error;
  }
  expect(checked.state.draft).toEqual(beforeProbe);
  expect(capabilities.roles.length).toBe(roles.length);
  expect(capabilities.roles.every((r) => r.measurements.length >= 5)).toBe(
    true,
  );
  expect(
    capabilities.roles.every((r) =>
      r.measurements.every((m) => m['identicalRasterRejected']),
    ),
  ).toBe(true);
  const destination = `${evidence}/${id}/qa`;
  await mkdir(destination, { recursive: true });

  for (const role of capabilities.roles)
    for (const measurement of role.measurements) {
      const options = measurement['options'] as {
        path: string;
        weight: number;
        actual: object;
      }[];
      for (const option of options) {
        report.options.push({ role: role.id, ...option });
      }
      for (const comparison of measurement['comparisons'] as object[])
        report.comparisons.push({
          role: role.id,
          width: measurement['width'],
          component: measurement['component'],
          ...comparison,
        });
    }
  await archiveTypography(capabilities, destination);
  if (id === 'task-manager') {
    expect(
      capabilities.roles.some((r) => r.rejectedWeights.includes(600)),
    ).toBe(true);
    expect(
      report.comparisons.some(
        (c) =>
          (c as { weights?: number[]; status?: string }).weights?.join(',') ===
            '600,700' && (c as { status?: string }).status === 'FAIL',
      ),
    ).toBe(true);
    const medium = page.locator(
      '[data-token="primitive.weight.medium"] .field-control select',
    );
    await expect(medium).toHaveValue('600');
    await expect(medium.locator('option[value="600"]')).toBeDisabled();
    await expect(medium.locator('option[value="700"]')).toBeEnabled();
    expect(capabilities.status).toBe('FAIL');
    const approvalAttempt = await page.evaluate(async () => {
      const modulePath = '/@id/__x00__virtual:wdf-project';
      const { connection } = (await import(/* @vite-ignore */ modulePath))
        .default;
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
          operation: {
            type: 'approve',
            confirmed: true,
            runId: view.state.qa.id,
            configurationDigest: view.context.configurationDigest,
          },
        }),
      });
      return { status: response.status, body: await response.json() };
    });
    expect(approvalAttempt.status).toBe(409);
    expect(approvalAttempt.body.error).toContain('APPROVAL_QA_REQUIRED');
    expect(checked.state.draft.tokens['primitive.weight.medium'].value).toBe(
      600,
    );
  } else
    expect(
      capabilities.status,
      JSON.stringify(
        capabilities.roles.map((r) => ({ id: r.id, errors: r.errors })),
      ),
    ).toBe('PASS');
  // An explicit valid user selection changes only the Draft, invalidates proof, and can be undone.
  const regularToken =
    id === 'task-manager' ? 'primitive.weight.medium' : 'primitive.weight.body';
  const originalWeight = beforeProbe.tokens[regularToken].value;
  const regularField = page.locator(
    `[data-token="${regularToken}"] .field-control select`,
  );
  await regularField.focus();
  await page.keyboard.press('End');
  await expect
    .poll(async () => (await getState()).state.draft.tokens[regularToken].value)
    .toBe(700);
  await expect(page.locator('[data-typography-status]')).toHaveAttribute(
    'data-typography-status',
    'STALE',
  );
  await expect(regularField.locator('option[value="400"]')).toBeDisabled();
  const reviewToggle = page.getByRole('button', { name: /^Review/ });
  if ((await reviewToggle.getAttribute('aria-expanded')) === 'false')
    await reviewToggle.click();
  await page.getByRole('button', { name: 'Changes', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(async () => (await getState()).state.draft.tokens[regularToken].value)
    .toBe(originalWeight);
  report.errors.push(
    ...capabilities.errors,
    ...capabilities.roles.flatMap((r) =>
      r.errors.map((e) => `${id}/${r.id}: ${e}`),
    ),
  );
  await page.getByRole('button', { name: '390 CSS px', exact: true }).click();
  const heading = roles.find((r) => r.id === 'display')!;
  const sizes = [
    ...new Set(
      [
        resolved.base[heading.size]!,
        ...resolved.responsive.map((r) => r.tokens[heading.size]!),
      ].map((t) => Number(t.value)),
    ),
  ].sort((a, b) => a - b);
  const config = JSON.parse(source);
  let sizeToken = heading.size;
  while (typeof config.tokens[sizeToken].value === 'object')
    sizeToken = config.tokens[sizeToken].value.ref;
  const sizeField = page.locator(`[data-token="${sizeToken}"] input`);
  const sizeShots = [];
  for (const size of sizes) {
    await sizeField.fill(String(size));
    await sizeField.blur();
    await expect(frame.locator(heading.selector).first()).toHaveCSS(
      'font-size',
      `${size}px`,
    );
    const result = await capture(frame, heading, `${id}-display-size-${size}`);
    report.sizes.push({
      token: sizeToken,
      expectedSize: size,
      actual: result.actual,
      evidence: result.path,
    });
    sizeShots.push({ size, ...result });
  }
  for (let i = 0; i < sizeShots.length; i++)
    for (let k = i + 1; k < sizeShots.length; k++) {
      const a = sizeShots[i]!,
        b = sizeShots[k]!,
        difference = glyphDifference(a.png, b.png);
      const pass =
        a.actual.family === b.actual.family &&
        a.actual.weight === b.actual.weight &&
        a.actual.text === b.actual.text &&
        a.actual.size === a.size &&
        b.actual.size === b.size &&
        difference.distinct;
      report.comparisons.push({
        role: 'display-size',
        sizes: [a.size, b.size],
        ...difference,
        status: pass ? 'PASS' : 'FAIL',
        evidence: [a.path, b.path],
      });
      if (!pass)
        report.errors.push(`${id}: declared heading sizes not distinct`);
    }
  await sizeField.fill(String(resolved.base[sizeToken]!.value));
  await sizeField.blur();
  await expect(frame.locator(heading.selector).first()).toHaveCSS(
    'font-size',
    `${resolved.base[sizeToken]!.value}px`,
  );
  await expect(page.locator('.save-status')).toContainText(
    'Working Draft mentve',
  );
  report.sourceUnchanged =
    (await readFile(join(root, 'wdf/tokens.json'), 'utf8')) === source;
  if (!report.sourceUnchanged)
    report.errors.push('QA changed authoritative token source');
  return report;
}

test('M6-R05: actual font capabilities, honest Lab options and mandatory approval evidence', async ({
  page,
}, testInfo) => {
  test.setTimeout(1200000);
  await mkdir(evidence, { recursive: true });
  const report = {
    status: 'ERROR',
    commit: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    version: '0.1.0-rc.1',
    harnessSha256: createHash('sha256')
      .update(await readFile('tests/m6/typography.spec.ts'))
      .digest('hex'),
    environment: {
      platform: process.platform,
      node: process.version,
      chromium: page.context().browser()!.version(),
    },
    projects: [] as Awaited<ReturnType<typeof inspectProject>>[],
    error: '',
  };
  try {
    const task = await isolatedLab();
    try {
      report.projects.push(
        await inspectProject(
          page,
          task.url,
          task.root,
          'task-manager',
          taskRoles,
        ),
      );
      await page.goto('about:blank');
      await task.restart();
      await page.goto(task.url);
      await page
        .getByRole('button', { name: 'Typography', exact: true })
        .click();
      await expect(page.locator('[data-typography-status]')).toHaveAttribute(
        'data-typography-status',
        'STALE',
      );
      await expect(
        page.locator(
          '[data-token="primitive.weight.medium"] .field-control select',
        ),
      ).toHaveValue('600');
    } finally {
      await task.close();
    }
    const { root } = JSON.parse(
      await readFile('test-results/m6-consumer.json', 'utf8'),
    );
    const consumer = launch(root);
    try {
      await expect
        .poll(() => consumer.log(), { timeout: 30000 })
        .toContain('WDF UI Lab');
      report.projects.push(
        await inspectProject(
          page,
          'http://127.0.0.1:5175',
          root,
          'hangar',
          consumerRoles,
        ),
      );
    } finally {
      await consumer.close();
    }
    report.status = report.projects.every((p) => p.errors.length === 0)
      ? 'PASS'
      : 'FAIL';
    expect(
      report.projects.flatMap((p) => p.errors),
      'R05 real typography failures',
    ).toEqual([]);
  } catch (error) {
    report.error = String(error);
    throw error;
  } finally {
    console.log(
      'WDF_R05_RESULT_BEGIN\n' +
        JSON.stringify(report, null, 2) +
        '\nWDF_R05_RESULT_END',
    );
    await writeFile(
      'test-results/m6-r05-typography.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    await testInfo.attach('R05-real-application-typography', {
      body: JSON.stringify(report),
      contentType: 'application/json',
    });
  }
});
