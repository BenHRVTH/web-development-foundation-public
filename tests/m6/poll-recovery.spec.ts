import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { isolatedLab } from '../isolated-lab';

test('M6 polling: failed reads recover without overlap; an uncertain real Draft write requires explicit readback', async ({
  page,
}) => {
  const lab = await isolatedLab({ port: 5197 });
  const evidence = {
    status: 'ERROR',
    commit: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    readFailures: 0,
    peakConcurrentReads: 0,
    writeRequests: 0,
    autoReadRecovery: false,
    uncertainWriteNeedsExplicitReadback: false,
    authorityUnchanged: false,
  };
  try {
    const source = await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8');
    const statePath = join(lab.root, '.wdf-lab/task-manager/state.json');
    await page.goto(lab.url);
    await expect(page.locator('.preview-status')).toHaveText('Élő kapcsolat', {
      timeout: 30000,
    });
    await expect(page.locator('.save-status')).toContainText(
      'Working Draft mentve',
    );
    const initial = await readFile(statePath, 'utf8');
    let failReads = true,
      activeReads = 0;
    await page.route('**/__wdf/state', async (route) => {
      if (!failReads) {
        await route.continue();
        return;
      }
      activeReads++;
      evidence.peakConcurrentReads = Math.max(
        evidence.peakConcurrentReads,
        activeReads,
      );
      // Longer than the 1.5s poll interval: overlapping requests are observable.
      await new Promise((resolve) => setTimeout(resolve, 1800));
      evidence.readFailures++;
      await route.abort('timedout');
      activeReads--;
    });
    await expect(page.locator('.change-notice')).toContainText(
      'A mentési szolgáltatás nem érhető el.',
      { timeout: 15000 },
    );
    const field = page.locator(
      '[data-token="primitive.color.accent"] .field-control input[type="text"]',
    );
    await expect(field).toBeDisabled();
    await expect
      .poll(() => evidence.readFailures, { timeout: 15000 })
      .toBeGreaterThanOrEqual(2);
    expect(evidence.peakConcurrentReads).toBe(1);
    expect(await readFile(statePath, 'utf8')).toBe(initial);
    failReads = false;
    await expect(field).toBeEnabled({ timeout: 15000 });
    await expect(page.locator('.change-notice button')).not.toBeVisible();
    evidence.autoReadRecovery = true;

    await page.route('**/__wdf/change', async (route) => {
      evidence.writeRequests++;
      // The server really persists this Draft once, then its response is lost.
      await route.fetch();
      await route.abort('failed');
    });
    await field.fill('#126174');
    await expect(page.locator('.change-notice')).toContainText(
      'A művelet nem igazolt.',
      { timeout: 15000 },
    );
    await expect(field).toBeDisabled();
    const saved = JSON.parse(await readFile(statePath, 'utf8')).payload;
    expect(saved.draft.tokens['primitive.color.accent'].value).toBe('#126174');
    expect(saved.history).toHaveLength(1);
    // Two normal poll intervals cannot clear a write-uncertainty block or retry it.
    await page.waitForTimeout(3200);
    await expect(field).toBeDisabled();
    expect(evidence.writeRequests).toBe(1);
    await page
      .locator('.change-notice')
      .getByRole('button', { name: 'Mentett Draft visszatöltése' })
      .click();
    await expect(field).toBeEnabled({ timeout: 15000 });
    await expect(field).toHaveValue('#126174');
    expect(evidence.writeRequests).toBe(1);
    evidence.uncertainWriteNeedsExplicitReadback = true;
    expect(await readFile(join(lab.root, 'wdf/tokens.json'), 'utf8')).toBe(
      source,
    );
    evidence.authorityUnchanged = true;
    evidence.status = 'PASS';
  } finally {
    await writeFile(
      'test-results/m6-poll-recovery.json',
      JSON.stringify(evidence, null, 2) + '\n',
    );
    await lab.close();
  }
});
