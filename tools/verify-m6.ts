import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const npmCli: string =
  process.env['npm_execpath'] ??
  (() => {
    throw new Error('Run this tool through its npm run script.');
  })();
async function snapshot(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const e of await readdir(root, { withFileTypes: true })) {
    if (
      [
        'node_modules',
        '.cache',
        '.git',
        '.wdf-lab',
        'dist',
        'test-results',
        'playwright-report',
        'artifacts',
      ].includes(e.name)
    )
      continue;
    const p = join(root, e.name);
    if (e.isDirectory()) Object.assign(out, await snapshot(p));
    else
      out[p] = createHash('sha256')
        .update(await readFile(p))
        .digest('hex');
  }
  return out;
}
await mkdir('test-results', { recursive: true });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
// A failed or interrupted invocation must never expose a prior run's PASS.
for (const [name, status] of [
  ['m6-results.json', 'ERROR'],
  ['m6-package-reproducibility.json', 'NOT_RUN'],
  ['m6-r05-typography.json', 'NOT_RUN'],
  ['m6-poll-recovery.json', 'NOT_RUN'],
])
  await writeFile(
    `test-results/${name}`,
    JSON.stringify(
      {
        status,
        commit,
        version: '0.1.0-rc.1',
        platform: process.platform,
        reason: 'Current verify:m6 invocation has not completed this check.',
      },
      null,
      2,
    ) + '\n',
  );
const before = await snapshot('packages');
const appBefore = await snapshot('apps/task-manager');
const consumerBefore = await snapshot('examples');
const commands: { command: string; exitCode: number; durationMs: number }[] =
  [];
const steps =
  process.platform === 'win32'
    ? [
        'check:spec',
        'test:m5:storage',
        'build:packages',
        'install:consumer',
        'test:m6',
      ]
    : ['verify:m5', 'build:packages', 'install:consumer', 'test:m6'];
for (const step of steps) {
  const start = Date.now();
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, 'run', step], {
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  commands.push({
    command: `npm run ${step}`,
    exitCode,
    durationMs: Date.now() - start,
  });
  if (exitCode) break;
}
const after = await snapshot('packages');
const appAfter = await snapshot('apps/task-manager');
const consumerAfter = await snapshot('examples');
const unchanged =
  JSON.stringify(before) === JSON.stringify(after) &&
  JSON.stringify(appBefore) === JSON.stringify(appAfter) &&
  JSON.stringify(consumerBefore) === JSON.stringify(consumerAfter);
const success =
  commands.length === steps.length &&
  commands.every((c) => c.exitCode === 0) &&
  unchanged;
if (success) {
  const report = JSON.parse(
    await readFile('test-results/m6-browser.json', 'utf8'),
  );
  if (
    report.stats.expected !== 6 ||
    report.stats.unexpected ||
    report.stats.skipped ||
    report.stats.flaky
  )
    throw new Error('All six M6 browser tests required without skips/retries');
  const typography = JSON.parse(
    await readFile('test-results/m6-r05-typography.json', 'utf8'),
  );
  if (typography.status !== 'PASS' || typography.projects.length !== 2)
    throw new Error(
      'R05 requires successful real-render evidence for both projects',
    );
  const first = JSON.parse(
    await readFile('artifacts/packages/inventory.json', 'utf8'),
  );
  const rebuild = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, ['tools/build-packages.ts'], {
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  if (rebuild) throw new Error('Second pack failed');
  const second = JSON.parse(
    await readFile('artifacts/packages/inventory.json', 'utf8'),
  );
  if (JSON.stringify(first) !== JSON.stringify(second))
    throw new Error('Non-reproducible package artifacts');
  await writeFile(
    'test-results/m6-package-reproducibility.json',
    JSON.stringify(
      {
        status: 'PASS',
        inventory: first.map((p: { name: string; sha256: string }) => ({
          name: p.name,
          sha256: p.sha256,
        })),
      },
      null,
      2,
    ) + '\n',
  );
}
// Keep current regression captures separate from historical handoffs.
for (const milestone of ['m3', 'm4', 'm5']) {
  const directory = `docs/reports/evidence/${milestone}`;
  // Fresh exports have no historical captures. Windows does not run these Linux suites.
  if (!(await readdir('docs/reports/evidence')).includes(milestone)) continue;
  await cp(directory, `artifacts/evidence/${milestone}`, { recursive: true });
}
const result = {
  status: success ? 'PASS' : 'FAIL',
  commit,
  version: '0.1.0-rc.1',
  platform: process.platform,
  node: process.version,
  arch: process.arch,
  commands,
  sourceIntegrity: unchanged,
  sourceBefore: { packages: before, app: appBefore, consumer: consumerBefore },
  sourceAfter: { packages: after, app: appAfter, consumer: consumerAfter },
  manualReview: 'NOT_RUN',
  screenReader: 'NOT_RUN',
  otherPlatform: 'NOT_RUN',
};
await writeFile(
  'test-results/m6-results.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  `M6 ${process.platform}: ${result.status}; this platform only; manual and other-platform evidence are separate.`,
);
if (!success) process.exitCode = 1;
