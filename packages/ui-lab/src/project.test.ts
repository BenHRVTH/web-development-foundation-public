import { afterEach, expect, test } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import manifest from '../../../apps/task-manager/wdf/project.json';
import tokens from '../../../apps/task-manager/wdf/tokens.json';
import { resolveLabProject } from './project.ts';
import { categoryOf } from './editor.ts';
import { startLab } from './server.ts';
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});
async function fixture(input: unknown = manifest, values: unknown = tokens) {
  const root = await mkdtemp(join(tmpdir(), 'wdf-m3-'));
  roots.push(root);
  await mkdir(join(root, 'wdf'));
  await Promise.all([
    writeFile(join(root, 'wdf/project.json'), JSON.stringify(input)),
    writeFile(join(root, 'wdf/tokens.json'), JSON.stringify(values)),
    writeFile(join(root, 'wdf/registry.ts'), 'export default [];'),
    writeFile(
      join(root, 'wdf/preview.ts'),
      "export default {version:'1.0.0'};",
    ),
  ]);
  return root;
}
test('M3-S01: actual project is identified from Contract; all globals get exactly one supported category', async () => {
  const project = await resolveLabProject(resolve('apps/task-manager'));
  expect(project.manifest.project.id).toBe('task-manager');
  expect(project.previewEntry).toMatch(/wdf\/preview.ts$/);
  expect(project.widths).toEqual([320, 390, 768, 1024, 1440]);
  for (const [id, token] of Object.entries(project.config.tokens))
    if (token.scope.kind === 'global')
      expect(['Colors', 'Typography', 'Spacing', 'Shapes', 'Layout']).toContain(
        categoryOf(id, token),
      );
});
test('M3-S02: missing, incompatible, deferred, remote/shared origin and incomplete width Contracts are rejected', async () => {
  for (const input of [
    {},
    { ...manifest, schemaVersion: '9.0.0' },
    { ...manifest, adapter: { id: 'other', version: '1.0.0' } },
    {
      ...manifest,
      preview: {
        availability: 'deferred',
        milestone: 'M3',
        entryPoint: 'wdf/preview.ts',
      },
    },
    ...[
      'https://example.test',
      'http://localhost:5176',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:5176/path',
    ].map((origin) => ({
      ...manifest,
      preview: { ...manifest.preview, origin },
    })),
    { ...manifest, preview: { ...manifest.preview, widths: [390] } },
  ])
    await expect(resolveLabProject(await fixture(input))).rejects.toThrow();
});
test('M3-S03: malformed identity blocks, existing value errors open for incremental repair without writing', async () => {
  const source = {
    ...tokens,
    tokens: {
      ...tokens.tokens,
      'semantic.space.page': {
        ...tokens.tokens['semantic.space.page'],
        value: 19,
      },
    },
  };
  const root = await fixture(manifest, source);
  const before = await readFile(join(root, 'wdf/tokens.json'), 'utf8');
  expect(
    (await resolveLabProject(root)).config.tokens['semantic.space.page']?.value,
  ).toBe(19);
  expect(await readFile(join(root, 'wdf/tokens.json'), 'utf8')).toBe(before);
  await expect(
    resolveLabProject(
      await fixture(manifest, { ...source, schemaVersion: 'bad' }),
    ),
  ).rejects.toThrow();
});
test('M3-S04: actual CLI exits nonzero on incompatible Contract before starting either listener', async () => {
  const root = await fixture({ ...manifest, schemaVersion: '9.0.0' });
  await expect(
    promisify(execFile)(
      process.execPath,
      [resolve('packages/ui-lab/bin/ui-lab.ts')],
      { cwd: root },
    ),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining('CONTRACT_VERSION_UNSUPPORTED'),
  });
});

test('M3-S05: reusable launcher serves another Contract and its original HTML, then releases both listeners', async () => {
  const root = await fixture({
    ...manifest,
    project: { id: 'another-project', name: 'Másik projekt' },
    preview: { ...manifest.preview, origin: 'http://127.0.0.1:5177' },
  });
  await writeFile(
    join(root, 'index.html'),
    '<!doctype html><html><head><title>Another application</title></head><body><h1>Original application entry</h1></body></html>',
  );
  const servers = await startLab(root);
  try {
    const html = await (await fetch('http://127.0.0.1:5177')).text();
    expect(html).toContain('Original application entry');
    expect(html).toContain('virtual:wdf-preview-bridge');
    const bootstrap = await (
      await fetch('http://127.0.0.1:5175/@id/__x00__virtual:wdf-project')
    ).text();
    expect(bootstrap).toContain('another-project');
    expect(bootstrap).not.toContain('task-manager');
  } finally {
    await servers.close();
  }
}, 15000);

test('M3-S06: incompatible preview declaration is rejected and can be corrected before restarting', async () => {
  const root = await fixture();
  await writeFile(
    join(root, 'wdf/preview.ts'),
    "export default {version:'9.0.0'};",
  );
  await expect(startLab(root)).rejects.toThrow('PREVIEW_VERSION_UNSUPPORTED');
  await writeFile(
    join(root, 'wdf/preview.ts'),
    "export default {version:'1.0.0'};",
  );
  const servers = await startLab(root);
  await servers.close();
}, 15000);
