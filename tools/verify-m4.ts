import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
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
const before = await snapshot();
await mkdir('test-results/m4', { recursive: true });
await rm('test-results/m4/visual.json', { force: true });
for (const w of [320, 390, 768, 1024, 1440])
  await rm(`test-results/m4/geometry-${w}.json`, { force: true });
const commands: { command: string; exitCode: number }[] = [];
for (const script of ['verify:m3', 'test:m4']) {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn('npm', ['run', script], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  commands.push({ command: `npm run ${script}`, exitCode });
  if (exitCode) break;
}
const after = await snapshot();
const unchanged = JSON.stringify(before) === JSON.stringify(after);
let geometries: unknown[] = [];
let browserCounts: {
  expected: number;
  skipped: number;
  unexpected: number;
  flaky: number;
} | null = null;
let visual: unknown[] = [];
const passed = commands.length === 2 && commands.every((c) => c.exitCode === 0);
if (passed) {
  geometries = (
    await Promise.all(
      [320, 390, 768, 1024, 1440].map(async (w) =>
        JSON.parse(
          await readFile(`test-results/m4/geometry-${w}.json`, 'utf8'),
        ),
      ),
    )
  ).flat();
  browserCounts = JSON.parse(
    await readFile('test-results/m4-browser.json', 'utf8'),
  ).stats;
  visual = JSON.parse(await readFile('test-results/m4/visual.json', 'utf8'));
  if (
    !browserCounts ||
    browserCounts.expected < 15 ||
    browserCounts.skipped ||
    browserCounts.unexpected ||
    browserCounts.flaky ||
    visual.length !== 4
  )
    throw new Error(
      'M4 requires the full browser suite and four pixel comparisons without skip/retry/failure.',
    );
  if (geometries.length !== 135)
    throw new Error('M4 requires 27 fixtures at all five real viewports.');
}
const report = {
  status: passed && unchanged ? 'PASS' : 'FAIL',
  commands,
  authoritativeSourceUnchanged: unchanged,
  sourceBefore: before,
  sourceAfter: after,
  geometries,
  browserCounts,
  visual,
};
await writeFile(
  'test-results/m4-results.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  `M4: ${report.status}; unchanged source: ${unchanged}; rendered fixture/viewport cases: ${geometries.length}`,
);
if (report.status !== 'PASS') process.exitCode = 1;
