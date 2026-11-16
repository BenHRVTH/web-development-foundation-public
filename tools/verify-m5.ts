import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
async function snapshot() {
  const files: string[] = [];
  async function walk(path: string) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) await walk(file);
      else files.push(file);
    }
  }
  await walk('apps/task-manager/src');
  await walk('apps/task-manager/wdf');
  await walk('packages/foundation/src');
  return Object.fromEntries(
    await Promise.all(
      files.sort().map(async (file) => [
        file,
        createHash('sha256')
          .update(await readFile(file))
          .digest('hex'),
      ]),
    ),
  );
}
const before = await snapshot(),
  commands: { command: string; exitCode: number }[] = [];
await mkdir('test-results', { recursive: true });
for (const script of ['verify:m4', 'test:m5']) {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn('npm', ['run', script], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  commands.push({ command: `npm run ${script}`, exitCode });
  if (exitCode) break;
}
const after = await snapshot(),
  unchanged = JSON.stringify(before) === JSON.stringify(after);
let counts = null,
  approvalCases = 0;
const passed = commands.length === 2 && commands.every((c) => c.exitCode === 0);
if (passed) {
  counts = JSON.parse(
    await readFile('test-results/m5-browser.json', 'utf8'),
  ).stats;
  // The suite owns the real approval runner; no skipped/flaky/retried test counts as a pass.
  if (
    !counts ||
    counts.expected !== 11 ||
    counts.skipped ||
    counts.unexpected ||
    counts.flaky
  )
    throw new Error(
      'M5 requires all eleven browser scenarios without skips/retries/failures.',
    );
  const report = JSON.parse(
    await readFile('test-results/m5-browser.json', 'utf8'),
  );
  const tests = report.suites.flatMap(
    (s: {
      specs: {
        tests: {
          results: { attachments: { name: string; body?: string }[] }[];
        }[];
      }[];
    }) => s.specs.flatMap((spec) => spec.tests.flatMap((t) => t.results)),
  );
  const evidence = tests
    .flatMap(
      (r: { attachments: { name: string; body?: string }[] }) => r.attachments,
    )
    .find((a: { name: string }) => a.name === 'approval-qa');
  if (!evidence?.body) throw new Error('Missing real Approval QA evidence.');
  const qa = JSON.parse(Buffer.from(evidence.body, 'base64').toString('utf8'));
  if (
    qa.status !== 'PASS' ||
    qa.running ||
    qa.checks.length !== 7 ||
    qa.checks.some((c: { status: string }) => c.status !== 'PASS')
  )
    throw new Error('Approval QA did not execute successfully.');
  approvalCases = qa.checks.find(
    (c: { ruleId: string }) => c.ruleId === 'WDF-GEOMETRY',
  ).evidence.length;
  if (approvalCases !== 160)
    throw new Error(
      `Expected 32 real website/fixture states × 5 viewports; got ${approvalCases}.`,
    );
  await writeFile(
    'test-results/m5-approval-qa.json',
    JSON.stringify(qa, null, 2) + '\n',
  );
}
const report = {
  status: passed && unchanged ? 'PASS' : 'FAIL',
  commands,
  authoritativeSourceUnchanged: unchanged,
  counts,
  approvalCases,
  sourceBefore: before,
  sourceAfter: after,
};
await writeFile(
  'test-results/m5-results.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  `M5: ${report.status}; source/Foundation unchanged: ${unchanged}; real Approval QA cases: ${approvalCases}`,
);
if (report.status !== 'PASS') process.exitCode = 1;
