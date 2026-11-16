import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { validateTypographyProfile, resolveTokens, unwrap } from '@wdf/core';
import { TypographyProbe } from '../../packages/qa/src/typography';
import { isolatedLab } from '../isolated-lab';

test('M6-R05 negative: a hardcoded real component weight is an integration failure, not a supported fixed font', async ({
  page,
}) => {
  const lab = await isolatedLab({ port: 5197 });
  try {
    const source = await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8');
    await page.setViewportSize({ width: 1960, height: 1200 });
    await page.goto(lab.url);
    await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat', {
      timeout: 30000,
    });
    await page.getByRole('button', { name: '390 CSS px', exact: true }).click();
    const project = await page.evaluate(async () => {
      const path = '/@id/__x00__virtual:wdf-project';
      return (await import(/* @vite-ignore */ path)).default;
    });
    const profile = validateTypographyProfile(
      project.typography,
      project.config,
    );
    const resolved = unwrap(resolveTokens(project.config));
    // Fault-isolation profile only: all original candidates are still measured
    // by the separate acceptance test with the unchanged canonical project JSON.
    for (const role of profile.roles) {
      role.targets = role.targets.filter((t) => t.workspace === 'website');
      if (!['action', 'task-title'].includes(role.id))
        role.weights = [Number(resolved.base[role.weightToken]!.value)];
    }
    // The production probe owns a private QA host. Do not let the normal Lab
    // preview synchronizer race this fault-isolation probe's snapshots.
    await page.goto(lab.url + '/__wdf/qa');
    await page.evaluate((origin) => {
      const iframe = document.createElement('iframe');
      iframe.src = origin;
      iframe.style.cssText = 'border:0;width:390px;height:900px;display:block';
      document.body.append(iframe);
    }, project.connection.previewOrigin);
    const frame = (await (await page
      .locator('iframe')
      .elementHandle())!.contentFrame())!;
    await expect.poll(() => frame.evaluate(() => innerWidth)).toBe(390);
    // Deliberately break this real component's binding, without changing its
    // original 600 baseline or writing application/Draft sources.
    const fault = await frame.addStyleTag({
      content: '.page-heading .button--primary{font-weight:600!important}',
    });
    // Native hover is intentionally left over from a previous interaction.
    // Weight-induced wrapping must not turn it into a different glyph context.
    const taskTitle = frame
      .locator('.task-card h2 .task-card__link > span')
      .first();
    await taskTitle.hover();
    await expect(taskTitle).toHaveCSS('color', 'rgb(91, 60, 180)');
    const directory = resolve('test-results/m6-typography-binding-negative');
    await mkdir(directory, { recursive: true });
    const probe = new TypographyProbe(
      profile,
      project.config,
      project.catalog,
      project.connection,
      directory,
      [390],
    );
    try {
      await probe.measure(frame, page, 390, 'website', 'normal');
    } finally {
      await fault.evaluate((el) => el.parentNode?.removeChild(el));
    }
    const report = probe.finish();
    await writeFile(
      join(directory, 'report.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    const action = report.roles.find((r) => r.id === 'action')!;
    expect(report.status).toBe('FAIL');
    expect(action.measurements[0]!['baselineMatches']).toBe(true);
    expect(
      action.errors.some((e) =>
        e.includes('TYPOGRAPHY_OPTION_BINDING_MISMATCH'),
      ),
    ).toBe(true);
    expect(action.verifiedWeights).toEqual([]);
    const title = report.roles.find((r) => r.id === 'task-title')!;
    expect(title.errors).toEqual([]);
    expect(title.verifiedWeights).toEqual(expect.arrayContaining([700, 400]));
    for (const measurement of title.measurements) {
      const baseline = measurement['baseline'] as { actual: { color: string } };
      expect(baseline.actual.color).toBe('rgb(37, 34, 55)');
      const comparisons = measurement['comparisons'] as {
        weights: number[];
        sameContext: boolean;
        status: string;
      }[];
      expect(comparisons.every((c) => c.sameContext)).toBe(true);
      for (const pair of comparisons)
        if (pair.weights.every((w) => title.verifiedWeights.includes(w)))
          expect(pair.status).toBe('PASS');
    }
    expect(
      report.roles
        .filter((r) => r.id !== 'action')
        .every((r) => r.errors.length === 0),
    ).toBe(true);
    expect(await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8')).toBe(
      source,
    );
  } finally {
    await lab.close();
  }
});
