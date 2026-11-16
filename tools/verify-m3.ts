import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
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
await mkdir('test-results/m3', { recursive: true });
for (const width of [320, 390, 768, 1024, 1440])
  await rm(`test-results/m3/r01-${width}.json`, { force: true });
const commands: { command: string; exitCode: number }[] = [];
let failed = false;
for (const script of ['verify:m2', 'test:m3']) {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn('npm', ['run', script], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  commands.push({ command: `npm run ${script}`, exitCode });
  if (exitCode) {
    failed = true;
    break;
  }
}
const after = await snapshot();
const unchanged = JSON.stringify(before) === JSON.stringify(after);
let visual: unknown[] = [];
if (!failed) {
  visual = (
    await Promise.all(
      [320, 390, 768, 1024, 1440].map(async (width) =>
        JSON.parse(await readFile(`test-results/m3/r01-${width}.json`, 'utf8')),
      ),
    )
  ).flat();
  if (visual.length !== 25)
    throw new Error('R01 requires all 25 screenshot/geometry pairs.');
}
const report = {
  status: !failed && unchanged ? 'PASS' : 'FAIL',
  commands,
  authoritativeSourceUnchanged: unchanged,
  sourceBefore: before,
  sourceAfter: after,
  visual,
};
await writeFile(
  'test-results/m3-results.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  `M3: ${report.status}; authoritative application/token sources ${unchanged ? 'unchanged' : 'CHANGED'}; R01 pairs: ${visual.length}`,
);
if (failed || !unchanged) process.exitCode = 1;
