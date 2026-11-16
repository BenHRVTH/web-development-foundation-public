import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { validateTypographyProfile, resolveTokens, unwrap } from '@wdf/core';
import { TypographyProbe } from '../../packages/qa/src/typography';
import { isolatedLab } from '../isolated-lab';
import { archiveTypography } from '../typography-evidence';
import type { ChangeOperation } from '@wdf/core/change';
import { typographyReportSchema } from '@wdf/core';

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
    // A current value outside the declared candidates must not be promoted.
    // Use a real isolated Draft and complete Approval QA, so rejection is not
    // explained merely by a targeted/missing QA run.
    await page.goto(lab.url);
    await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat', {
      timeout: 30000,
    });
    const getState = () =>
      page.evaluate(async () => {
        const path = '/@id/__x00__virtual:wdf-project';
        const { connection } = (await import(/* @vite-ignore */ path)).default;
        return (
          await fetch('/__wdf/state', {
            headers: { 'X-WDF-Session': connection.session },
          })
        ).json();
      });
    const command = (operation: ChangeOperation) =>
      page.evaluate(async (operation) => {
        const path = '/@id/__x00__virtual:wdf-project';
        const { connection } = (await import(/* @vite-ignore */ path)).default;
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
        return { status: response.status, body: await response.json() };
      }, operation);
    expect(
      (
        await command({
          type: 'edit',
          patch: {
            scope: { kind: 'global' },
            changes: { 'primitive.weight.medium': 500 },
          },
        })
      ).status,
    ).toBe(200);
    const beforeQa = await getState();
    await page.getByRole('button', { name: 'Typography', exact: true }).click();
    const medium = page.locator(
      '[data-token="primitive.weight.medium"] .field-control select',
    );
    await expect(medium).toHaveValue('500');
    await expect(medium.locator('option[value="500"]')).toBeDisabled();
    expect((await command({ type: 'qa', level: 'approval' })).status).toBe(200);
    await expect
      .poll(async () => (await getState()).state.qa?.running, {
        timeout: 660000,
        intervals: [1000, 2000],
      })
      .toBe(false);
    const afterQa = await getState();
    expect(afterQa.state.qa.level).toBe('approval');
    expect(afterQa.state.qa.checks).toHaveLength(7);
    expect(afterQa.state.qa.status).toBe('FAIL');
    expect(
      afterQa.state.qa.checks
        .filter((c: { ruleId: string }) => c.ruleId !== 'WDF-TYPE-001')
        .every((c: { status: string }) => c.status === 'PASS'),
    ).toBe(true);
    const typeCheck = afterQa.state.qa.checks.find(
      (c: { ruleId: string }) => c.ruleId === 'WDF-TYPE-001',
    );
    expect(typeCheck.status).toBe('FAIL');
    const unsupported = typographyReportSchema.parse(
      JSON.parse(typeCheck.evidence[0]),
    );
    expect(unsupported.status).toBe('FAIL');
    for (const id of ['utility', 'action']) {
      const role = unsupported.roles.find((r) => r.id === id)!;
      expect(role.currentValues).toEqual([500]);
      expect(role.verifiedWeights).not.toContain(500);
      expect(role.errors).toContain(
        'TYPOGRAPHY_CURRENT_WEIGHT_NOT_VERIFIED: 500',
      );
    }
    await writeFile(
      join(directory, 'unsupported-current.json'),
      JSON.stringify(unsupported, null, 2) + '\n',
    );
    await archiveTypography(
      unsupported,
      join(directory, 'unsupported-current'),
    );
    await expect(page.locator('[data-typography-status]')).toHaveAttribute(
      'data-typography-status',
      'FAIL',
    );
    await expect(medium).toHaveValue('500');
    await expect(medium.locator('option[value="500"]')).toBeDisabled();
    await expect(medium.locator('option[value="500"]')).toContainText(
      'megőrzött, nem igazolt',
    );
    expect(afterQa.state.draft).toEqual(beforeQa.state.draft);
    const approval = await command({
      type: 'approve',
      confirmed: true,
      runId: afterQa.state.qa.id,
      configurationDigest: afterQa.context.configurationDigest,
    });
    expect(approval.status).toBe(409);
    expect(approval.body.error).toContain('APPROVAL_QA_REQUIRED');
    expect((await getState()).state.baseline).toBeNull();
    expect((await getState()).state.draft).toEqual(beforeQa.state.draft);
    expect(await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8')).toBe(
      source,
    );
  } finally {
    await lab.close();
  }
});
