import { afterEach, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
  symlink,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { resolveLabProject } from '../project.ts';
import { ChangeManager, type ManagerOptions } from './service.ts';
import { digest, decodeState, encodeState, SimulatedCrash } from './storage.ts';
import {
  canApprove,
  REQUIRED_APPROVAL_CHECKS,
  type ChangeOperation,
  type ChangeView,
} from '@wdf/core/change';
import type { QualityEvidence } from '@wdf/core';
const roots: string[] = [],
  managers: ChangeManager[] = [];
afterEach(async () => {
  await Promise.allSettled(managers.splice(0).map((m) => m.close()));
  await Promise.all(
    roots.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});
async function fixture(bad = false) {
  await mkdir('.cache', { recursive: true });
  const root = await mkdtemp(resolve('.cache/m5-unit-'));
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
  if (bad) {
    const path = join(root, 'wdf/tokens.json'),
      config = JSON.parse(await readFile(path, 'utf8'));
    config.tokens['semantic.space.page'].value = 19;
    config.tokens['semantic.space.section'].value = 19;
    await writeFile(path, JSON.stringify(config));
  }
  return root;
}
async function open(root: string, overrides: Partial<ManagerOptions> = {}) {
  const project = await resolveLabProject(root);
  const manager = new ChangeManager({
    root,
    manifest: project.manifest,
    config: project.config,
    componentTokenIds: Object.keys(project.config.tokens).filter((id) =>
      id.startsWith('component.'),
    ),
    // This unit double tests the approval state machine; real Chromium QA is separately exercised end-to-end.
    runQa: async (_config, context) =>
      REQUIRED_APPROVAL_CHECKS.map((ruleId) => ({
        id: randomUUID(),
        ruleId,
        status: 'PASS',
        severity: 'blocker',
        target: 'test double',
        description: 'Isolated state machine fixture',
        evidence: ['Explicit unit test double, not browser evidence'],
        configurationDigest: context.configurationDigest,
        sourceRevision: context.sourceRevision,
        environment: context.environment,
      })),
    ...overrides,
  });
  await manager.open();
  managers.push(manager);
  return manager;
}
async function send(
  manager: ChangeManager,
  operation: ChangeOperation,
  view?: ChangeView,
  id = randomUUID(),
) {
  const current = view ?? (await manager.view());
  return manager.execute({
    version: '1.0.0',
    projectId: current.state.projectId,
    session: 'unit',
    requestId: id,
    expectedRevision: current.state.revision,
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
async function qa(manager: ChangeManager) {
  await send(manager, { type: 'qa', level: 'approval' });
  await manager.waitQa();
  return manager.view();
}
async function approve(manager: ChangeManager) {
  const v = await qa(manager);
  return send(manager, {
    type: 'approve',
    runId: v.state.qa!.id,
    configurationDigest: v.context.configurationDigest,
    confirmed: true,
  });
}
test('T02/T13: immutable Initial Reference, absent baseline, one durable Draft and deterministic restart with history/redo', async () => {
  const root = await fixture(),
    m = await open(root),
    before = await m.view(),
    source = await readFile(join(root, 'wdf/tokens.json'), 'utf8');
  expect(before.state.baseline).toBeNull();
  expect(before.state.initial.config).toEqual(before.state.draft);
  await send(m, edit(32));
  await send(m, { type: 'undo' });
  const persisted = await readFile(m.storage.paths.state, 'utf8');
  await m.close();
  const restarted = await open(root);
  expect(await readFile(restarted.storage.paths.state, 'utf8')).toBe(persisted);
  await send(restarted, { type: 'redo' });
  const restored = await restarted.view();
  expect(restored.state.draft.tokens['semantic.space.page']?.value).toBe(32);
  expect(restored.state.initial).toEqual(before.state.initial);
  expect(await readFile(join(root, 'wdf/tokens.json'), 'utf8')).toBe(source);
});
test('T04/T05: spacing category replaces all declared global/base/responsive values as one atomic Undo, new edit clears Redo', async () => {
  const m = await open(await fixture()),
    before = await m.view();
  const after = await send(m, { type: 'preset', name: 'spacious' });
  expect(after.state.history).toHaveLength(1);
  for (const token of Object.values(after.state.draft.tokens))
    if (token.scope.kind === 'global' && token.type === 'spacing')
      expect(token.value).toBe(32);
  for (const rule of Object.values(after.state.draft.responsive ?? {}))
    for (const [id, value] of Object.entries(rule.overrides))
      if (
        after.state.draft.tokens[id]?.scope.kind === 'global' &&
        after.state.draft.tokens[id]?.type === 'spacing'
      )
        expect(value).toBe(32);
  expect((await send(m, { type: 'undo' })).state.draft).toEqual(
    before.state.draft,
  );
  await send(m, edit(16));
  expect((await m.view()).state.history).toHaveLength(1);
  await expect(send(m, { type: 'redo' })).rejects.toThrow('REDO_EMPTY');
});
test('T10/T11/T12/C07: genuine 19px blocker, rejection keeps Draft/blocker, individual repair and one Undo', async () => {
  const m = await open(await fixture(true)),
    before = await m.view(),
    findings = before.findings
      .filter((f) => f.proposal)
      .filter((f, i, all) => all.findIndex((x) => x.target === f.target) === i);
  expect(findings.length).toBe(2);
  expect(findings[0]!.ruleId).toBe('WDF-SPACING-001');
  const rejected = await send(m, {
    type: 'reject',
    findingId: findings[0]!.id,
  });
  expect(rejected.state.draft).toEqual(before.state.draft);
  expect(rejected.findings.find((f) => f.id === findings[0]!.id)?.status).toBe(
    'FAIL',
  );
  const accepted = await send(m, {
    type: 'accept',
    findingId: findings[1]!.id,
  });
  expect(accepted.state.history).toHaveLength(1);
  expect(accepted.state.history[0]?.changes).toHaveLength(1);
  expect(accepted.state.draft.tokens[findings[0]!.target]?.value).toBe(19);
  expect((await send(m, { type: 'undo' })).state.draft).toEqual(
    before.state.draft,
  );
});
test('Audit proposals are stale after source/environment/config changes and do not modify React code', async () => {
  const root = await fixture(true),
    m = await open(root),
    before = await m.view(),
    proposal = before.findings.find((f) => f.proposal)!;
  const path = join(root, 'src/App.tsx');
  const code = await readFile(path, 'utf8');
  await writeFile(path, code + '\n// external compatible React edit\n');
  await expect(
    send(m, { type: 'accept', findingId: proposal.id }),
  ).rejects.toThrow('PROPOSAL_STALE');
  expect((await m.view()).state.draft).toEqual(before.state.draft);
  expect(await readFile(path, 'utf8')).toBe(
    code + '\n// external compatible React edit\n',
  );
});
test('T14: approval requires current successful complete QA and explicit confirmation; preserves initial and coherent CSS/TS', async () => {
  const m = await open(await fixture()),
    before = await m.view();
  await send(m, edit(32));
  await expect(
    send(m, {
      type: 'approve',
      runId: 'missing',
      configurationDigest: (await m.view()).context.configurationDigest,
      confirmed: true,
    }),
  ).rejects.toThrow('APPROVAL_QA_REQUIRED');
  const v = await qa(m);
  expect(canApprove(v.state.qa, v.context)).toBe(true);
  await expect(
    m.execute({
      version: '1.0.0',
      projectId: v.state.projectId,
      session: 'unit',
      requestId: randomUUID(),
      expectedRevision: v.state.revision,
      operation: {
        type: 'approve',
        runId: v.state.qa!.id,
        configurationDigest: v.context.configurationDigest,
        confirmed: false,
      },
    }),
  ).rejects.toThrow();
  const approved = await send(m, {
    type: 'approve',
    runId: v.state.qa!.id,
    configurationDigest: v.context.configurationDigest,
    confirmed: true,
  });
  expect(approved.state.initial).toEqual(before.state.initial);
  expect(approved.state.baseline?.config).toEqual(approved.state.draft);
  const { generateTokens } = await import('@wdf/core/generation');
  const expected = generateTokens(approved.state.draft);
  expect(expected.ok).toBe(true);
  if (!expected.ok) return;
  for (const id of ['css', 'ts'] as const)
    expect(await m.storage.read(id)).toContain(expected.value.sourceDigest);
  expect(JSON.parse((await m.storage.read('tokens'))!)).toEqual(
    approved.state.draft,
  );
});
test.each(['FAIL', 'ERROR', 'NOT_RUN', 'STALE'] as const)(
  'C08: %s mandatory QA check cannot be approved',
  async (status) => {
    const m = await open(await fixture(), {
      runQa: async (_c, context) => [
        {
          id: randomUUID(),
          ruleId: 'WDF-TOKENS',
          severity: 'blocker',
          status,
          target: 'Draft',
          description: 'fault',
          evidence: ['deliberate failed check'],
          configurationDigest: context.configurationDigest,
          sourceRevision: context.sourceRevision,
          environment: context.environment,
        },
      ],
    });
    const v = await qa(m);
    expect(canApprove(v.state.qa, v.context)).toBe(false);
    await expect(
      send(m, {
        type: 'approve',
        runId: v.state.qa!.id,
        configurationDigest: v.context.configurationDigest,
        confirmed: true,
      }),
    ).rejects.toThrow('APPROVAL_QA_REQUIRED');
  },
);
test('Missing mandatory check is not a successful approval gate even when every reported check says PASS', async () => {
  const m = await open(await fixture(), { runQa: async () => [] });
  const v = await qa(m);
  expect(v.state.qa?.status).toBe('NOT_RUN');
  expect(canApprove(v.state.qa, v.context)).toBe(false);
});
test('C08/T16/C09: edits and compatible external React changes invalidate QA without replacing Draft; restart retains it', async () => {
  const root = await fixture(),
    m = await open(root);
  await qa(m);
  await send(m, edit(32));
  expect((await m.view()).state.qa?.status).toBe('STALE');
  const v = await qa(m);
  const path = join(root, 'src/App.tsx');
  await writeFile(path, (await readFile(path, 'utf8')) + '\n// external\n');
  const changed = await m.view();
  expect(changed.compatibility).toBe('source-changed');
  expect(changed.state.qa?.status).toBe('STALE');
  expect(changed.state.draft).toEqual(v.state.draft);
  await expect(
    send(m, {
      type: 'approve',
      runId: v.state.qa!.id,
      configurationDigest: v.context.configurationDigest,
      confirmed: true,
    }),
  ).rejects.toThrow('APPROVAL_QA_REQUIRED');
  await m.close();
  expect((await (await open(root)).view()).state.draft).toEqual(v.state.draft);
});
test('Relevant environment change invalidates a previous successful QA result', async () => {
  const old = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
  const m = await open(await fixture());
  await qa(m);
  try {
    process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] =
      '/different/explicit/test-browser';
    expect((await m.view()).state.qa?.status).toBe('STALE');
  } finally {
    if (old === undefined)
      delete process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
    else process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] = old;
  }
});
test.each(['token-value', 'token-structure', 'contract', 'registry'] as const)(
  'External %s conflict preserves Draft and blocks writes',
  async (kind) => {
    const root = await fixture(),
      m = await open(root);
    await send(m, edit(32));
    const before = await m.view();
    const path = join(
      root,
      kind === 'contract'
        ? 'wdf/project.json'
        : kind === 'registry'
          ? 'wdf/registry.ts'
          : 'wdf/tokens.json',
    );
    if (kind === 'registry')
      await writeFile(
        path,
        (await readFile(path, 'utf8')) + '\n// registry integration changed\n',
      );
    else {
      const data = JSON.parse(await readFile(path, 'utf8'));
      if (kind === 'contract') data.schemaVersion = '9.0.0';
      else if (kind === 'token-structure')
        delete data.tokens['primitive.color.accent'];
      else data.tokens['primitive.color.accent'].value = '#123456';
      await writeFile(path, JSON.stringify(data));
    }
    expect((await m.view()).compatibility).toBe('conflict');
    await expect(send(m, edit(16))).rejects.toThrow();
    expect((await m.view()).state.draft).toEqual(before.state.draft);
  },
);
test('Corrupt saved data is diagnosed on restart and never replaced; invalid history is rejected even with recalculated checksum', async () => {
  const root = await fixture(),
    m = await open(root);
  await send(m, edit(32));
  await m.close();
  const raw = (await m.storage.read('state'))!,
    state = decodeState(raw);
  state.cursor = 99;
  await writeFile(m.storage.paths.state, encodeState(state));
  await expect(open(root)).rejects.toThrow('STORAGE_CORRUPT');
  expect(await m.storage.read('state')).toBe(encodeState(state));
  await writeFile(m.storage.paths.state, '{broken');
  await expect(open(root)).rejects.toThrow('STORAGE_CORRUPT');
  expect(await m.storage.read('state')).toBe('{broken');
});
test('An incompatible approved reference remains inspectable as metadata but cannot be applied over Draft', async () => {
  const root = await fixture(),
    m = await open(root);
  await approve(m);
  await m.close();
  const state = decodeState((await m.storage.read('state'))!);
  delete state.baseline!.config.tokens['primitive.color.accent'];
  await writeFile(m.storage.paths.state, encodeState(state));
  const restarted = await open(root);
  const v = await restarted.view();
  expect(v.referenceCompatible).toBe(false);
  expect(v.state.draft).toEqual(state.draft);
});
test.each([
  'transaction:prepared',
  'transaction:tokens',
  'transaction:css',
  'transaction:ts',
])(
  'T15: %s failure restores previous approved baseline and all authority outputs',
  async (step) => {
    let fail = '';
    const m = await open(await fixture(), {
      fault: (s) => {
        if (s === fail) throw new Error('EACCES injected');
      },
    });
    await approve(m);
    const previous = await m.view(),
      files = await Promise.all(
        ['tokens', 'css', 'ts'].map((id) =>
          m.storage.read(id as 'tokens' | 'css' | 'ts'),
        ),
      );
    await send(m, edit(32));
    const v = await qa(m);
    fail = step;
    await expect(
      send(m, {
        type: 'approve',
        runId: v.state.qa!.id,
        configurationDigest: v.context.configurationDigest,
        confirmed: true,
      }),
    ).rejects.toThrow('FINALIZE_ROLLED_BACK');
    expect((await m.view()).state.baseline).toEqual(previous.state.baseline);
    expect(
      await Promise.all(
        ['tokens', 'css', 'ts'].map((id) =>
          m.storage.read(id as 'tokens' | 'css' | 'ts'),
        ),
      ),
    ).toEqual(files);
  },
);
test.each([
  'transaction:prepared',
  'transaction:tokens',
  'transaction:css',
  'transaction:ts',
  'transaction:state',
])(
  'Unexpected termination at %s recovers deterministically on restart',
  async (step) => {
    let fail = false;
    const root = await fixture(),
      m = await open(root, {
        fault: (s) => {
          if (fail && s === step) throw new SimulatedCrash('POWER_LOSS');
        },
      });
    await approve(m);
    const previous = await m.view();
    await send(m, edit(32));
    const v = await qa(m);
    fail = true;
    await expect(
      send(m, {
        type: 'approve',
        runId: v.state.qa!.id,
        configurationDigest: v.context.configurationDigest,
        confirmed: true,
      }),
    ).rejects.toThrow('POWER_LOSS');
    await m.close();
    const restarted = await open(root),
      restored = await restarted.view();
    if (step === 'transaction:state')
      expect(restored.state.baseline?.config).toEqual(v.state.draft);
    else expect(restored.state.baseline).toEqual(previous.state.baseline);
    expect(restored.state.initial).toEqual(previous.state.initial);
    const actual = JSON.parse((await restarted.storage.read('tokens'))!);
    expect(digest(actual)).toBe(restored.state.authority.tokenSourceDigest);
  },
);
test('Save access error leaves persisted history, draft and authority unchanged and can be retried', async () => {
  let fail = false;
  const m = await open(await fixture(), {
    fault: (s) => {
      if (fail && s === 'save:before') throw new Error('EACCES injected');
    },
  });
  const before = await m.view(),
    raw = await m.storage.read('state');
  fail = true;
  await expect(send(m, edit(32))).rejects.toThrow('EACCES');
  expect((await m.view()).state).toEqual(before.state);
  expect(await m.storage.read('state')).toBe(raw);
  fail = false;
  await send(m, edit(32));
});
test('Duplicate, stale, concurrent, unknown-path, shell, Foundation and out-of-scope operations are rejected', async () => {
  const root = await fixture(),
    m = await open(root),
    v = await m.view(),
    id = randomUUID();
  await send(m, edit(32), v, id);
  await expect(send(m, edit(16), undefined, id)).rejects.toThrow('DUPLICATE');
  await expect(send(m, edit(16), v)).rejects.toThrow('REVISION_CONFLICT');
  const now = await m.view();
  const concurrent = await Promise.allSettled([
    send(m, edit(16), now),
    send(m, edit(24), now),
  ]);
  expect(concurrent.map((r) => r.status).sort()).toEqual([
    'fulfilled',
    'rejected',
  ]);
  for (const operation of [
    { type: 'execute', command: 'touch /tmp/pwned' },
    { type: 'edit', path: '../../etc/passwd' },
    {
      type: 'edit',
      patch: {
        scope: { kind: 'global' },
        changes: { 'foundation.spacing.16': 19 },
      },
    },
    {
      type: 'edit',
      patch: {
        scope: { kind: 'global' },
        changes: { 'component.button.radius': 32 },
      },
    },
  ]) {
    const view = await m.view();
    await expect(
      m.execute({
        version: '1.0.0',
        projectId: view.state.projectId,
        session: 'unit',
        requestId: randomUUID(),
        expectedRevision: view.state.revision,
        operation,
      }),
    ).rejects.toThrow();
  }
  await expect(open(root)).rejects.toThrow('STORAGE_BUSY');
});
test('Symlinked authoritative output cannot escape the project; previous authority remains intact', async () => {
  const root = await fixture(),
    m = await open(root),
    outside = join(root, 'outside.txt');
  await writeFile(outside, 'untouched');
  await rm(m.storage.paths.css);
  await symlink(outside, m.storage.paths.css);
  const v = await qa(m);
  await expect(
    send(m, {
      type: 'approve',
      runId: v.state.qa!.id,
      configurationDigest: v.context.configurationDigest,
      confirmed: true,
    }),
  ).rejects.toThrow('SYMLINK');
  expect(await readFile(outside, 'utf8')).toBe('untouched');
});
test('QA exceptions and interrupted persisted runs are visible ERROR, never PASS', async () => {
  const root = await fixture(),
    m = await open(root, {
      evidenceSession: 'current-font-session',
      runQa: async () => {
        throw new Error('BROWSER_LAUNCH_DENIED');
      },
    });
  const v = await qa(m);
  expect(v.state.qa?.status).toBe('ERROR');
  expect(v.state.qa?.checks[0]?.evidence[0]).toContain('BROWSER_LAUNCH_DENIED');
  await m.close();
  const state = decodeState((await m.storage.read('state'))!);
  state.qa!.running = true;
  state.qa!.status = 'NOT_RUN';
  await writeFile(m.storage.paths.state, encodeState(state));
  const restarted = await open(root);
  expect((await restarted.view()).state.qa?.status).toBe('ERROR');
  expect(
    (await restarted.view()).state.qa?.checks.at(-1)?.description,
  ).toContain('QA_INTERRUPTED');
});
test('A concurrent edit while QA runs makes its eventual result STALE', async () => {
  let finish!: (checks: QualityEvidence[]) => void;
  const m = await open(await fixture(), {
    runQa: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  await send(m, { type: 'qa', level: 'approval' });
  await send(m, edit(32));
  finish([]);
  await m.waitQa();
  expect((await m.view()).state.qa?.status).toBe('STALE');
});
test('External saved-state damage is visible during a running Lab and is not silently overwritten', async () => {
  const m = await open(await fixture());
  await writeFile(m.storage.paths.state, '{corrupt');
  await expect(m.readView()).rejects.toThrow('STORAGE_EXTERNAL_OR_UNCERTAIN');
  await expect(send(m, edit(32))).rejects.toThrow();
  expect(await m.storage.read('state')).toBe('{corrupt');
});
test('An uncertain save after rename blocks the session and restores the actual saved Draft on restart', async () => {
  let fail = false;
  const root = await fixture(),
    m = await open(root, {
      fault: (step) => {
        if (fail && step === 'save:after')
          throw new Error('directory fsync failed after rename');
      },
    });
  fail = true;
  await expect(send(m, edit(32))).rejects.toThrow(
    'STORAGE_EXTERNAL_OR_UNCERTAIN',
  );
  await expect(m.readView()).rejects.toThrow();
  await m.close();
  const restarted = await open(root);
  expect(
    (await restarted.view()).state.draft.tokens['semantic.space.page']?.value,
  ).toBe(32);
});
test('A damaged rollback journal is diagnosed before any recovery write', async () => {
  let fail = false;
  const root = await fixture(),
    m = await open(root, {
      fault: (step) => {
        if (fail && step === 'transaction:css')
          throw new SimulatedCrash('crash');
      },
    });
  await send(m, edit(32));
  const v = await qa(m);
  fail = true;
  await expect(
    send(m, {
      type: 'approve',
      runId: v.state.qa!.id,
      configurationDigest: v.context.configurationDigest,
      confirmed: true,
    }),
  ).rejects.toThrow('crash');
  await m.close();
  const path = join(m.storage.directory, 'transaction.json'),
    journal = JSON.parse(await readFile(path, 'utf8'));
  journal.entries[0].after += 'corruption';
  await writeFile(path, JSON.stringify(journal));
  const before = await m.storage.read('tokens');
  await expect(open(root)).rejects.toThrow('RECOVERY_JOURNAL_CHECKSUM');
  expect(await m.storage.read('tokens')).toBe(before);
});
test('Typing one field gesture is one Undo unit; a later gesture and a new branch stay separate', async () => {
  const m = await open(await fixture()),
    before = await m.view(),
    gestureId = randomUUID();
  for (const value of [16, 24, 32])
    await send(m, { ...edit(value), gestureId } as ChangeOperation);
  expect((await m.view()).state.history).toHaveLength(1);
  expect((await send(m, { type: 'undo' })).state.draft).toEqual(
    before.state.draft,
  );
  await send(m, { ...edit(16), gestureId } as ChangeOperation);
  expect((await m.view()).state.history).toHaveLength(1);
  await expect(send(m, { type: 'redo' })).rejects.toThrow('REDO_EMPTY');
  await send(m, { ...edit(32), gestureId: randomUUID() } as ChangeOperation);
  expect((await m.view()).state.history).toHaveLength(2);
});
test('An inherited responsive audit error repairs only its real declared slot', async () => {
  const root = await fixture(),
    path = join(root, 'wdf/tokens.json'),
    config = JSON.parse(await readFile(path, 'utf8'));
  config.responsive.tablet.overrides['semantic.space.page'] = 19;
  delete config.responsive.desktop.overrides['semantic.space.page'];
  config.responsive.desktop.overrides['semantic.size.heading'] = {
    ref: 'primitive.size.heading',
  };
  await writeFile(path, JSON.stringify(config));
  const m = await open(root),
    v = await m.view();
  const inherited = v.findings.find((f) =>
    f.evidence.some((e) =>
      e.includes('$.responsive.desktop.semantic.space.page'),
    ),
  )!;
  expect(inherited.proposal?.responsive).toBe('tablet');
  const accepted = await send(m, { type: 'accept', findingId: inherited.id });
  expect(accepted.state.draft.tokens['semantic.space.page']?.value).toEqual(
    v.state.draft.tokens['semantic.space.page']?.value,
  );
  expect(
    accepted.state.draft.responsive?.['tablet']?.overrides[
      'semantic.space.page'
    ],
  ).toBe(16);
});

test('Concurrent restart after a dead owner grants exactly one new process lease', async () => {
  const root = await fixture();
  const child = spawn(process.execPath, ['-e', ''], { stdio: 'ignore' });
  const pid = child.pid!;
  await once(child, 'exit');
  const directory = join(root, '.wdf-lab', 'task-manager');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'lock.json'), JSON.stringify({ pid }));
  const results = await Promise.allSettled([open(root), open(root)]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  const winner = results.find((r) => r.status === 'fulfilled')!;
  if (winner.status === 'fulfilled') {
    expect((await winner.value.readView()).state.baseline).toBeNull();
    await winner.value.close();
  }
});
test('A Linux zombie owner is dead even while kill(pid,0) succeeds; recovery reclaims its lease safely', async () => {
  if (process.platform !== 'linux')
    throw new Error(
      'M5 process lifecycle gate requires the documented Linux environment.',
    );
  const child = spawn(
    'python3',
    [
      '-u',
      '-c',
      'import os,sys\npid=os.fork()\nif pid==0: os._exit(0)\nprint(pid,flush=True)\nsys.stdin.readline()\nos.waitpid(pid,0)',
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  );
  try {
    const [data] = await once(child.stdout, 'data'),
      pid = Number(String(data).trim());
    const deadline = Date.now() + 3000;
    while (
      !(await readFile(`/proc/${pid}/status`, 'utf8')).includes('Z (zombie)')
    ) {
      if (Date.now() > deadline) throw new Error('Zombie fixture did not exit');
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(() => process.kill(pid, 0)).not.toThrow();
    const root = await fixture(),
      directory = join(root, '.wdf-lab', 'task-manager');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'lock.json'), JSON.stringify({ pid }));
    const manager = await open(root);
    expect((await manager.readView()).state.initial).toBeDefined();
    const owner = JSON.parse(
      await readFile(join(directory, 'lock.json'), 'utf8'),
    );
    expect(owner.pid).toBe(process.pid);
    expect(owner.leaseId).toBeDefined();
  } finally {
    const exit = once(child, 'exit');
    child.stdin.end();
    await exit;
  }
}, 10000);

test('System-font proof becomes STALE after restart while Draft/history and saved evidence remain untouched', async () => {
  const root = await fixture();
  const runQa: ManagerOptions['runQa'] = async (_config, context) =>
    REQUIRED_APPROVAL_CHECKS.map((ruleId) => ({
      id: randomUUID(),
      ruleId,
      status: 'PASS',
      severity: 'blocker',
      target: 'unit session state machine double',
      description: 'Explicit unit double, not font-render proof',
      evidence: [
        ruleId === 'WDF-TYPE-001'
          ? JSON.stringify({ session: 'first-font-session' })
          : 'unit double',
      ],
      configurationDigest: context.configurationDigest,
      sourceRevision: context.sourceRevision,
      environment: context.environment,
    }));
  const first = await open(root, {
    evidenceSession: 'first-font-session',
    runQa,
  });
  await send(first, edit(32));
  const measured = await qa(first);
  expect(measured.state.qa?.status).toBe('PASS');
  const saved = await first.storage.read('state');
  await first.close();
  const second = await open(root, {
    evidenceSession: 'second-font-session',
    runQa,
  });
  const restarted = await second.view();
  expect(restarted.state.qa?.status).toBe('STALE');
  expect(restarted.state.draft).toEqual(measured.state.draft);
  expect(restarted.state.history).toEqual(measured.state.history);
  expect(await second.storage.read('state')).toBe(saved);
  expect(canApprove(restarted.state.qa, restarted.context)).toBe(false);
});

test('An unexecuted font check is NOT_RUN, not a stale font proof; original token FAIL evidence remains visible', async () => {
  const root = await fixture(true);
  const manager = await open(root, {
    evidenceSession: 'font-session',
    runQa: async (_config, context) =>
      REQUIRED_APPROVAL_CHECKS.map((ruleId) => ({
        id: randomUUID(),
        ruleId,
        status:
          ruleId === 'WDF-TOKENS'
            ? 'FAIL'
            : ruleId === 'WDF-REGISTRY'
              ? 'PASS'
              : 'NOT_RUN',
        severity: 'blocker',
        target: 'explicit unit state-machine double',
        description: 'Invalid tokens prevent browser execution',
        evidence: ['No font measurement executed'],
        configurationDigest: context.configurationDigest,
        sourceRevision: context.sourceRevision,
        environment: context.environment,
      })),
  });
  const v = await qa(manager);
  expect(v.state.qa?.status).toBe('NOT_RUN');
  expect(
    v.state.qa?.checks.find((c) => c.ruleId === 'WDF-TOKENS')?.status,
  ).toBe('FAIL');
  expect(
    v.state.qa?.checks.find((c) => c.ruleId === 'WDF-TYPE-001')?.status,
  ).toBe('NOT_RUN');
  expect(canApprove(v.state.qa, v.context)).toBe(false);
});
