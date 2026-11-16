import { afterEach, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve, win32, posix } from 'node:path';
import { format } from 'prettier';
import { unwrap } from '@wdf/core';
import { loadProject } from '@wdf/core/node';
import { generateTokens } from '@wdf/core/generation';
import {
  REQUIRED_APPROVAL_CHECKS,
  type ChangeOperation,
} from '@wdf/core/change';
import {
  ChangeStorage,
  decodeState,
  isWithin,
  SimulatedCrash,
  WINDOWS_DURABILITY_NOTICE,
} from '../../packages/ui-lab/src/change/storage.ts';
import {
  ChangeManager,
  type ManagerOptions,
} from '../../packages/ui-lab/src/change/service.ts';
import { resolveLabProject } from '../../packages/ui-lab/src/project.ts';
import { startLab } from '../../packages/ui-lab/src/server.ts';

const roots: string[] = [];
const managers: ChangeManager[] = [];
afterEach(async () => {
  await Promise.all(managers.splice(0).map((m) => m.close()));
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  await mkdir('.cache', { recursive: true });
  const root = await mkdtemp(resolve('.cache/m5-portable-árvíz space-'));
  roots.push(root);
  for (const item of [
    'src',
    'wdf',
    'index.html',
    'vite.config.ts',
    'package.json',
  ])
    await cp(resolve('apps/task-manager', item), join(root, item), {
      recursive: true,
    });
  return root;
}
async function manager(root: string, overrides: Partial<ManagerOptions> = {}) {
  const project = await resolveLabProject(root);
  const m = new ChangeManager({
    root,
    manifest: project.manifest,
    config: project.config,
    componentTokenIds: [],
    // Storage/approval state-machine double. This is not browser QA evidence.
    runQa: async (_config, context) =>
      REQUIRED_APPROVAL_CHECKS.map((ruleId) => ({
        id: randomUUID(),
        ruleId,
        severity: 'blocker',
        status: 'PASS',
        target: 'portable storage test double',
        description: 'Explicit storage test double, not browser QA',
        evidence: ['Real Chromium QA remains in verify:m5'],
        configurationDigest: context.configurationDigest,
        sourceRevision: context.sourceRevision,
        environment: context.environment,
      })),
    ...overrides,
  });
  await m.open();
  managers.push(m);
  return m;
}
async function send(m: ChangeManager, operation: ChangeOperation) {
  const v = await m.view();
  return m.execute({
    version: '1.0.0',
    projectId: v.state.projectId,
    session: 'portable-test',
    requestId: randomUUID(),
    expectedRevision: v.state.revision,
    operation,
  });
}
const edit = (value: number): ChangeOperation => ({
  type: 'edit',
  patch: {
    scope: { kind: 'global' },
    changes: { 'semantic.space.page': value },
  },
});
async function approve(m: ChangeManager) {
  await send(m, { type: 'qa', level: 'approval' });
  await m.waitQa();
  const v = await m.view();
  return send(m, {
    type: 'approve',
    runId: v.state.qa!.id,
    configurationDigest: v.context.configurationDigest,
    confirmed: true,
  });
}
async function authority(m: ChangeManager) {
  return Promise.all(
    (['tokens', 'css', 'ts'] as const).map((id) => m.storage.read(id)),
  );
}

test('Native containment handles Windows drives, case, UNC shares and sibling-prefix escapes', () => {
  for (const [base, target, expected] of [
    ['C:\\work\\project', 'C:\\work\\project\\.wdf-lab\\task-manager', true],
    ['C:\\work\\project', 'c:\\WORK\\PROJECT\\state.json', true],
    ['C:\\work\\project', 'C:\\work\\project-two\\state.json', false],
    ['C:\\work\\project', 'C:\\work\\project\\..\\outside', false],
    ['C:\\work\\project', 'D:\\work\\project\\state.json', false],
    ['C:\\', 'C:\\project\\state.json', true],
    [
      '\\\\server\\share\\project',
      '\\\\server\\share\\project\\state.json',
      true,
    ],
    [
      '\\\\server\\share\\project',
      '\\\\server\\other\\project\\state.json',
      false,
    ],
  ] as const)
    expect(isWithin(base, target, win32)).toBe(expected);
  expect(isWithin('/project', '/project/..draft/state.json', posix)).toBe(true);
  expect(isWithin('/project', '/project-two/state.json', posix)).toBe(false);
  expect(isWithin('/project', '/project/../outside', posix)).toBe(false);
});

test('First real Lab start creates missing .wdf-lab only after listening; both HTTP servers restart', async () => {
  const root = await fixture();
  const manifestPath = join(root, 'wdf/project.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.preview.origin = 'http://127.0.0.1:5200';
  await writeFile(manifestPath, JSON.stringify(manifest));
  await expect(
    readFile(join(root, '.wdf-lab/task-manager/state.json')),
  ).rejects.toMatchObject({ code: 'ENOENT' });
  let initial;
  for (let attempt = 0; attempt < 2; attempt++) {
    const servers = await startLab(root, { labPort: 5199 });
    try {
      expect((await fetch('http://127.0.0.1:5199/')).status).toBe(200);
      expect((await fetch('http://127.0.0.1:5200/')).status).toBe(200);
      for (const entry of [
        'virtual:wdf-preview-bridge',
        'virtual:wdf-studio',
      ]) {
        const compiled = await fetch(`http://127.0.0.1:5200/@id/${entry}`);
        expect(compiled.status).toBe(200);
        expect(await compiled.text()).toContain(
          entry === 'virtual:wdf-studio' ? 'mountStudio' : 'installPreview',
        );
      }
      const module = await (
        await fetch('http://127.0.0.1:5199/@id/__x00__virtual:wdf-project')
      ).text();
      const bootstrap = JSON.parse(
        module.match(/export default (\{[^\n]+\});/)![1]!,
      );
      const response = await fetch('http://127.0.0.1:5199/__wdf/state', {
        headers: { 'X-WDF-Session': bootstrap.connection.session },
      });
      expect(response.status).toBe(200);
      const view = await response.json();
      const persisted = decodeState(
        await readFile(join(root, '.wdf-lab/task-manager/state.json'), 'utf8'),
      );
      expect(view.state).toEqual(persisted);
      expect(view.diagnostic).toBe(
        process.platform === 'win32' ? WINDOWS_DURABILITY_NOTICE : '',
      );
      if (attempt === 0) initial = persisted.initial;
      expect(persisted.initial).toEqual(initial);
      expect(persisted.baseline).toBeNull();
      expect(persisted.cursor).toBe(0);
    } finally {
      // The module-only smoke starts Vite's asynchronous dependency scan without
      // a browser crawl. Settle it before closing/deleting this temporary root.
      try {
        await Promise.all(
          [servers.lab, servers.preview].flatMap((server) =>
            Object.values(server.environments).map(
              (environment) => environment.depsOptimizer?.scanProcessing,
            ),
          ),
        );
      } finally {
        await servers.close();
      }
    }
  }
}, 30000);

test.each([false, true])(
  'Fresh storage, save/restart, Undo/Redo and immutable authority (external storage=%s)',
  async (external) => {
    const root = await fixture();
    const storageRoot = root + '-external';
    if (external) roots.push(storageRoot);
    const options = external
      ? { storageDirectory: join(storageRoot, 'new storage', 'missing nested') }
      : {};
    const m = await manager(root, options);
    const before = await m.view(),
      files = await authority(m);
    await send(m, edit(32));
    await send(m, edit(16));
    await send(m, { type: 'undo' });
    const saved = decodeState((await m.storage.read('state'))!);
    expect(saved.history).toHaveLength(2);
    expect(saved.cursor).toBe(1);
    expect(saved.draft.tokens['semantic.space.page']!.value).toBe(32);
    await m.close();
    const restarted = await manager(root, options);
    expect((await restarted.view()).state).toEqual(saved);
    expect(
      (await send(restarted, { type: 'redo' })).state.draft.tokens[
        'semantic.space.page'
      ]!.value,
    ).toBe(16);
    expect((await send(restarted, { type: 'undo' })).state.draft).toEqual(
      saved.draft,
    );
    expect((await restarted.view()).state.initial).toEqual(
      before.state.initial,
    );
    expect(await authority(restarted)).toEqual(files);
    expect(
      (await readdir(restarted.storage.directory)).filter((n) =>
        n.endsWith('.tmp'),
      ),
    ).toEqual([]);
  },
);

test('Native traversal and sibling paths are rejected before writing outside the trusted roots', async () => {
  const root = await fixture();
  const storage = new ChangeStorage(root, 'task-manager', '../outside.json');
  await storage.acquire();
  try {
    await expect(storage.read('tokens')).rejects.toThrow(
      'STORAGE_PATH_FORBIDDEN',
    );
    await expect(
      storage.safe(join(root + '-sibling', 'x'), root),
    ).rejects.toThrow('STORAGE_PATH_FORBIDDEN');
    await expect(storage.safe(join(root, '..', 'x'), root)).rejects.toThrow(
      'STORAGE_PATH_FORBIDDEN',
    );
  } finally {
    await storage.close();
  }
  const escaping = new ChangeStorage(
    root,
    '../../outside-project',
    'wdf/tokens.json',
  );
  await expect(escaping.acquire()).rejects.toThrow('STORAGE_PATH_FORBIDDEN');
});

test.each([
  'storage-parent',
  'storage-leaf',
  'configured-ancestor',
  'generated-parent',
] as const)(
  'Directory symlink/junction protection checks every component: %s',
  async (placement) => {
    const root = await fixture();
    const outside = join(root, 'untouched');
    await mkdir(outside);
    let storage = new ChangeStorage(root, 'task-manager', 'wdf/tokens.json');
    let link: string;
    if (placement === 'storage-parent') link = join(root, '.wdf-lab');
    else if (placement === 'storage-leaf') {
      await mkdir(join(root, '.wdf-lab'));
      link = storage.directory;
    } else if (placement === 'configured-ancestor') {
      link = join(root, 'linked-parent');
      storage = new ChangeStorage(
        root,
        'task-manager',
        'wdf/tokens.json',
        join(link, 'not-created'),
      );
    } else {
      link = join(root, 'src/generated');
      await rm(link, { recursive: true });
    }
    await symlink(
      outside,
      link,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    if (placement === 'generated-parent') {
      await storage.acquire();
      try {
        const tokens = await storage.read('tokens');
        await expect(
          storage.transaction({
            tokens: '{}',
            css: 'changed',
            ts: 'changed',
            state: '{}',
          }),
        ).rejects.toThrow('STORAGE_SYMLINK_FORBIDDEN');
        expect(await storage.read('tokens')).toBe(tokens);
      } finally {
        await storage.close();
      }
    } else
      await expect(storage.acquire()).rejects.toThrow(
        'STORAGE_SYMLINK_FORBIDDEN',
      );
    expect(await readdir(outside)).toEqual([]);
  },
);

test('Corrupt saved state is preserved and startup fails instead of replacing it', async () => {
  const root = await fixture(),
    m = await manager(root);
  await m.close();
  await writeFile(m.storage.paths.state, '{broken');
  await expect(manager(root)).rejects.toThrow('STORAGE_CORRUPT');
  expect(await readFile(m.storage.paths.state, 'utf8')).toBe('{broken');
});

test('Contract resource symlink/junction cannot escape the native project root during startup', async () => {
  const root = await fixture(),
    outside = root + '-outside';
  roots.push(outside);
  await mkdir(outside);
  await writeFile(join(outside, 'preview.ts'), 'outside sentinel');
  await symlink(
    outside,
    join(root, 'wdf/escaped'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  const path = join(root, 'wdf/project.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  manifest.preview.entryPoint = 'wdf/escaped/preview.ts';
  await writeFile(path, JSON.stringify(manifest));
  const result = await loadProject(root);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Outside resource was accepted');
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code: 'RESOURCE_UNRESOLVED',
      message: expect.stringContaining('escapes project root'),
    }),
  );
  expect(await readFile(join(outside, 'preview.ts'), 'utf8')).toBe(
    'outside sentinel',
  );
});

test('Approval replaces all four files coherently and restart preserves Initial and new Baseline', async () => {
  const root = await fixture(),
    m = await manager(root),
    initial = (await m.view()).state.initial;
  await send(m, edit(32));
  const approved = await approve(m);
  const generated = unwrap(generateTokens(approved.state.draft));
  for (const [id, raw, parser] of [
    ['css', generated.css, 'css'],
    ['ts', generated.typescript, 'typescript'],
  ] as const)
    expect(await m.storage.read(id)).toBe(
      await format(raw, { parser, singleQuote: true, trailingComma: 'all' }),
    );
  expect(JSON.parse((await m.storage.read('tokens'))!)).toEqual(
    approved.state.draft,
  );
  await m.close();
  const restarted = await manager(root),
    view = await restarted.view();
  expect(view.state.baseline).toEqual(approved.state.baseline);
  expect(view.state.baseline!.config).toEqual(view.state.draft);
  expect(view.state.initial).toEqual(initial);
  await expect(
    readFile(join(m.storage.directory, 'transaction.json')),
  ).rejects.toMatchObject({ code: 'ENOENT' });
});

test.each([
  'transaction:prepared',
  'transaction:tokens',
  'transaction:css',
  'transaction:ts',
  'transaction:state',
])(
  'Journal recovery after interrupted approval at %s preserves a coherent old/new Baseline',
  async (step) => {
    let crash = false;
    const root = await fixture(),
      m = await manager(root, {
        fault: (s) => {
          if (crash && s === step)
            throw new SimulatedCrash('PROCESS_INTERRUPTED');
        },
      });
    const previous = await approve(m),
      files = await authority(m);
    await send(m, edit(32));
    crash = true;
    await expect(approve(m)).rejects.toThrow('PROCESS_INTERRUPTED');
    const draft = (await m.view()).state.draft;
    await m.close();
    const restarted = await manager(root),
      restored = await restarted.view();
    expect(restored.state.initial).toEqual(previous.state.initial);
    expect(restored.state.draft).toEqual(draft);
    if (step === 'transaction:state')
      expect(restored.state.baseline!.config).toEqual(draft);
    else {
      expect(restored.state.baseline).toEqual(previous.state.baseline);
      expect(await authority(restarted)).toEqual(files);
    }
    expect(JSON.parse((await restarted.storage.read('tokens'))!)).toEqual(
      restored.state.baseline!.config,
    );
  },
);

test('An approval write failure rolls back all authority and the previous Baseline', async () => {
  let fail = false;
  const m = await manager(await fixture(), {
    fault: (step) => {
      if (fail && step === 'transaction:css')
        throw new Error('EACCES test injection');
    },
  });
  const previous = await approve(m),
    files = await authority(m);
  await send(m, edit(32));
  fail = true;
  await expect(approve(m)).rejects.toThrow('FINALIZE_ROLLED_BACK');
  expect(await authority(m)).toEqual(files);
  expect((await m.view()).state.baseline).toEqual(previous.state.baseline);
});

test('A prepared journal recovers missing generated outputs whose parent never existed', async () => {
  const root = await fixture();
  await rm(join(root, 'src/generated'), { recursive: true });
  const m = await manager(root, {
    fault: (step) => {
      if (step === 'transaction:prepared')
        throw new SimulatedCrash('PROCESS_INTERRUPTED');
    },
  });
  const before = await m.view();
  await expect(approve(m)).rejects.toThrow('PROCESS_INTERRUPTED');
  await m.close();
  const restarted = await manager(root);
  expect((await restarted.view()).state.initial).toEqual(before.state.initial);
  expect((await restarted.view()).state.baseline).toBeNull();
  expect(await restarted.storage.read('css')).toBeNull();
  expect(await restarted.storage.read('ts')).toBeNull();
});

test('Directory-fsync failure is not swallowed; Windows exposes its different durability capability', async () => {
  let armed = false;
  const root = await fixture();
  const m = await manager(root, {
    fault: (step) => {
      if (armed && step === 'directory:sync')
        throw new Error('EIO directory fsync injection');
    },
  });
  const source = await authority(m);
  armed = true;
  if (process.platform === 'win32') {
    expect((await send(m, edit(32))).diagnostic).toContain(
      WINDOWS_DURABILITY_NOTICE,
    );
  } else {
    await expect(send(m, edit(32))).rejects.toThrow(
      'STORAGE_EXTERNAL_OR_UNCERTAIN',
    );
    await expect(send(m, edit(16))).rejects.toThrow(
      'STORAGE_EXTERNAL_OR_UNCERTAIN',
    );
    await m.close();
    // Rename completed, but directory sync failed: restart validates the file;
    // the failed request never falsely acknowledged a durable save.
    const restarted = await manager(root);
    expect(
      (await restarted.view()).state.draft.tokens['semantic.space.page']!.value,
    ).toBe(32);
  }
  expect(await authority(m)).toEqual(source);
});
