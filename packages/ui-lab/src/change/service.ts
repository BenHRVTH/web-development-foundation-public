import { randomUUID, createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserEnvironment } from '@wdf/qa/browser';
import { format } from 'prettier';
import {
  unwrap,
  validateManifest,
  updateTokensInScope,
  type EditableTokenConfig,
  type ProjectManifest,
  type QualityEvidence,
} from '@wdf/core';
import { generateTokens } from '@wdf/core/generation';
import {
  applyPatches,
  changesBetween,
  spacingPreset,
  liveAudit,
  requestSchema,
  sameContext,
  sameDesignContext,
  canApprove,
  runStatus,
  type ChangeState,
  type ChangeView,
  type SourceIdentity,
  type QualityContext,
  type QualityRun,
} from '@wdf/core/change';
import {
  ChangeStorage,
  decodeState,
  digest,
  encodeState,
  type StorageFault,
} from './storage.ts';

function structure(config: EditableTokenConfig) {
  return {
    schemaVersion: config.schemaVersion,
    tokens: Object.fromEntries(
      Object.entries(config.tokens).map(([id, token]) => [
        id,
        {
          type: token.type,
          scope: token.scope,
          ...(token.role ? { role: token.role } : {}),
        },
      ]),
    ),
    responsive: Object.fromEntries(
      Object.entries(config.responsive ?? {}).map(([name, r]) => [
        name,
        { minWidth: r.minWidth, ids: Object.keys(r.overrides).sort() },
      ]),
    ),
    exceptions: config.exceptions ?? [],
  };
}
async function tree(
  path: string,
  excluded: string[] = [],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  let entries: string[];
  try {
    entries = await readdir(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return result;
    throw error;
  }
  if (!entries.length) return result;
  for (const entry of (await readdir(path, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    if (excluded.includes(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error('SOURCE_SYMLINK_FORBIDDEN');
    const target = join(path, entry.name);
    if (entry.isDirectory())
      for (const [name, hash] of Object.entries(await tree(target, excluded)))
        result[entry.name + '/' + name] = hash;
    else
      result[entry.name] = createHash('sha256')
        .update(await readFile(target))
        .digest('hex');
  }
  return result;
}
export interface ManagerOptions {
  root: string;
  manifest: ProjectManifest;
  config: EditableTokenConfig;
  componentTokenIds: readonly string[];
  runQa: (
    config: EditableTokenConfig,
    context: QualityContext,
    level: QualityRun['level'],
    affectedTokenIds: string[],
    onProgress: (value: {
      completed: number;
      total: number;
      current: string;
    }) => void,
  ) => Promise<QualityEvidence[]>;
  evidenceSession?: string;
  storageDirectory?: string;
  fault?: StorageFault;
}
export class ChangeManager {
  readonly storage: ChangeStorage;
  private state!: ChangeState;
  private queue: Promise<unknown> = Promise.resolve();
  private job: Promise<void> | null = null;
  private closed = false;
  private fatal = '';
  private initialPending = false;
  private engineRevision = '';
  private progress:
    { completed: number; total: number; current: string } | undefined;
  readonly options: ManagerOptions;
  constructor(options: ManagerOptions) {
    this.options = options;
    this.storage = new ChangeStorage(
      options.root,
      options.manifest.project.id,
      options.manifest.designTokens.entryPoint,
      options.storageDirectory,
      options.fault,
    );
  }
  async open(deferInitial = false) {
    try {
      await this.storage.acquire();
      if (this.storage.recovered)
        this.options.config = unwrap(
          updateTokensInScope(
            this.options.manifest,
            JSON.parse((await this.storage.read('tokens'))!),
            { kind: 'global' },
            {},
          ),
        ).config;
      const identity = await this.identity();
      if (identity.tokenSourceDigest !== digest(this.options.config))
        throw new Error('STARTUP_TOKEN_SOURCE_CHANGED');
      const raw = await this.storage.read('state');
      if (raw) {
        this.state = decodeState(raw);
        if (
          this.state.projectId !== this.options.manifest.project.id ||
          this.state.contractVersion !== this.options.manifest.schemaVersion
        )
          throw new Error('STORAGE_PROJECT_CONTRACT_CONFLICT');
        if (this.state.qa?.running) {
          this.state.qa.running = false;
          this.state.qa.status = 'ERROR';
          this.state.qa.checks.push(
            this.errorCheck(
              this.state.qa.context,
              'QA_INTERRUPTED: a korábbi futás megszakadt.',
            ),
          );
          this.state.revision++;
          await this.storage.save(this.state);
        }
      } else {
        const config = structuredClone(this.options.config),
          context = { ...identity, configurationDigest: digest(config) };
        this.state = {
          version: '1.0.0',
          projectId: this.options.manifest.project.id,
          contractVersion: this.options.manifest.schemaVersion,
          revision: 0,
          authority: identity,
          initial: { config, context, createdAt: new Date().toISOString() },
          baseline: null,
          draft: config,
          history: [],
          cursor: 0,
          rejected: [],
          qa: null,
          receipts: [],
        };
        if (deferInitial) this.initialPending = true;
        else await this.storage.save(this.state);
      }
      return this;
    } catch (error) {
      await this.storage.close();
      throw error;
    }
  }
  async activate() {
    if (this.initialPending) {
      await this.storage.save(this.state);
      this.initialPending = false;
    }
  }
  async close() {
    this.closed = true;
    try {
      await this.job;
      await this.queue;
    } finally {
      await this.storage.close();
    }
  }
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    this.queue = result.catch(() => {});
    return result;
  }
  private async checkSavedState() {
    if (this.initialPending) return;
    try {
      const raw = await this.storage.read('state');
      if (!raw || digest(decodeState(raw)) !== digest(this.state))
        throw new Error('A mentett állapot és a szolgáltatás eltér.');
    } catch (error) {
      this.fatal = `STORAGE_EXTERNAL_OR_UNCERTAIN: ${String(error)} A fájl megmaradt; indítsd újra a Labot és ellenőrizd a mentést.`;
      throw new Error(this.fatal, { cause: error });
    }
  }
  async readView() {
    return this.serial(async () => {
      await this.checkSavedState();
      return this.view();
    });
  }
  private async identity(): Promise<SourceIdentity> {
    const { root } = this.options;
    const manifest = unwrap(
      validateManifest(
        JSON.parse(await readFile(join(root, 'wdf/project.json'), 'utf8')),
      ),
    );
    if (
      manifest.designTokens.entryPoint !==
      this.options.manifest.designTokens.entryPoint
    )
      throw new Error('CONTRACT_TOKEN_ENTRY_CHANGED');
    const config = JSON.parse(
      (await this.storage.read('tokens')) ?? 'null',
    ) as EditableTokenConfig;
    let vite: string | null = null;
    try {
      vite = await readFile(join(root, 'vite.config.ts'), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const source = {
      src: await tree(join(root, 'src'), ['generated']),
      public: await tree(join(root, 'public')),
      entry: await readFile(join(root, 'index.html'), 'utf8').catch((error) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      }),
      package: await readFile(join(root, 'package.json'), 'utf8').catch(
        (error) => {
          if (error.code === 'ENOENT') return null;
          throw error;
        },
      ),
      wdf: await tree(join(root, 'wdf'), [
        manifest.designTokens.entryPoint.split('/').at(-1)!,
      ]),
      vite,
    };
    const engine = await Promise.all(
      [
        '@wdf/foundation',
        '@wdf/core',
        '@wdf/adapter-react',
        '@wdf/ui-lab/cli',
        '@wdf/qa/browser',
      ].map(async (specifier) => {
        let directory = dirname(fileURLToPath(import.meta.resolve(specifier)));
        while (true) {
          try {
            const metadata = await readFile(
              join(directory, 'package.json'),
              'utf8',
            );
            return [
              specifier,
              {
                metadata,
                src: await tree(join(directory, 'src')),
                bin: await tree(join(directory, 'bin')),
                dist: await tree(join(directory, 'dist')),
              },
            ];
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            const parent = dirname(directory);
            if (parent === directory)
              throw new Error('QA_PACKAGE_ROOT_UNRESOLVED', { cause: error });
            directory = parent;
          }
        }
      }),
    );
    let directory = root,
      versions = '';
    while (true) {
      try {
        versions = await readFile(join(directory, 'package-lock.json'), 'utf8');
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        const parent = dirname(directory);
        if (parent === directory) break;
        directory = parent;
      }
    }
    const engineRevision = digest({ engine, versions });
    if (this.engineRevision && this.engineRevision !== engineRevision)
      throw new Error(
        'QA_RUNTIME_CHANGED: a futó Core/adapter/Lab/QA vagy függőség megváltozott; indítsd újra a Labot.',
      );
    this.engineRevision = engineRevision;
    return {
      contractDigest: digest({ manifest, integration: source.wdf, vite }),
      structureDigest: digest(structure(config)),
      tokenSourceDigest: digest(config),
      sourceRevision: digest(source),
      environment: digest({
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        versions,
        engine,
        chromium: await browserEnvironment(),
      }),
    };
  }
  async view(): Promise<ChangeView> {
    if (!this.state) throw new Error('SERVICE_STARTING');
    if (this.fatal) throw new Error(this.fatal);
    let identity: SourceIdentity;
    try {
      identity = await this.identity();
    } catch (error) {
      const context = {
        ...this.state.authority,
        configurationDigest: digest(this.state.draft),
      };
      return {
        state: structuredClone(this.state),
        context,
        findings: liveAudit(this.options.manifest, this.state.draft, context),
        compatibility: 'conflict',
        diagnostic: `SOURCE_CONFLICT: ${String(error)}. A mentett Draft megmaradt; ellenőrizd a projektet és indítsd újra a Labot.`,
        referenceCompatible: false,
        referenceStale: true,
        saveLocation: this.storage.paths.state,
      };
    }
    const context = {
      ...identity,
      configurationDigest: digest(this.state.draft),
    };
    const authority = this.state.authority;
    const conflict = [
      'contractDigest',
      'structureDigest',
      'tokenSourceDigest',
    ].some(
      (key) =>
        identity[key as keyof SourceIdentity] !==
        authority[key as keyof SourceIdentity],
    );
    const changed =
      identity.sourceRevision !== authority.sourceRevision ||
      identity.environment !== authority.environment;
    const state = structuredClone(this.state);
    if (state.qa?.running && this.progress) state.qa.progress = this.progress;
    let typographySessionCurrent = true;
    const typographyCheck = state.qa?.checks.find(
      (c) => c.ruleId === 'WDF-TYPE-001',
    );
    if (
      state.qa &&
      this.options.evidenceSession &&
      ((typographyCheck && ['PASS', 'FAIL'].includes(typographyCheck.status)) ||
        state.qa.status === 'PASS')
    ) {
      try {
        typographySessionCurrent =
          JSON.parse(typographyCheck?.evidence[0] ?? 'null')?.session ===
          this.options.evidenceSession;
      } catch {
        typographySessionCurrent = false;
      }
    }
    if (
      state.qa &&
      !state.qa.running &&
      (conflict ||
        !sameDesignContext(state.qa.context, context) ||
        !typographySessionCurrent)
    ) {
      state.qa.status = 'STALE';
      state.qa.checks = state.qa.checks.map((c) => ({ ...c, status: 'STALE' }));
    }
    const reference = state.baseline ?? state.initial;
    return {
      state,
      context,
      findings: [
        ...liveAudit(this.options.manifest, state.draft, context).map((f) => ({
          ...f,
          ...(state.rejected.includes(f.id)
            ? { decision: 'rejected' as const }
            : {}),
        })),
        ...(state.qa?.checks.filter((c) => c.status !== 'PASS') ?? []),
      ],
      compatibility: conflict
        ? 'conflict'
        : changed
          ? 'source-changed'
          : 'compatible',
      diagnostic: [
        this.storage.durabilityNotice,
        conflict
          ? 'CONTRACT_TOKEN_CONFLICT: a hiteles Contract vagy tokenforrás megváltozott. A Draftot megőriztük; írás és jóváhagyás blokkolva. Ellenőrizd a külső módosítást, majd indítsd újra a Labot.'
          : changed
            ? 'A React-forrás vagy a tesztkörnyezet változott. A Draft megmaradt; a korábbi QA elavult. Registry-változás után indítsd újra a Labot.'
            : '',
      ]
        .filter(Boolean)
        .join(' '),
      referenceCompatible:
        digest(structure(reference.config)) === identity.structureDigest,
      referenceStale:
        reference.context.sourceRevision !== identity.sourceRevision ||
        reference.context.environment !== identity.environment,
      saveLocation: this.storage.paths.state,
    };
  }
  private errorCheck(
    context: QualityContext,
    message: string,
  ): QualityEvidence {
    return {
      id: randomUUID(),
      ruleId: 'QA-EXECUTION',
      severity: 'blocker',
      status: 'ERROR',
      target: 'QA Engine',
      description: message,
      evidence: [message],
      ...{
        configurationDigest: context.configurationDigest,
        sourceRevision: context.sourceRevision,
        environment: context.environment,
      },
    };
  }
  async execute(input: unknown): Promise<ChangeView> {
    return this.serial(async () => {
      if (this.closed) throw new Error('SESSION_CLOSED');
      await this.checkSavedState();
      const request = requestSchema.parse(input);
      if (request.projectId !== this.state.projectId)
        throw new Error('PROJECT_MISMATCH');
      if (this.state.receipts.includes(request.requestId))
        throw new Error('DUPLICATE_OPERATION');
      if (request.expectedRevision !== this.state.revision)
        throw new Error(
          'REVISION_CONFLICT: újabb mentés létezik; töltsd vissza a közös Draftot.',
        );
      const view = await this.view();
      if (view.compatibility === 'conflict') throw new Error(view.diagnostic);
      const next = structuredClone(this.state),
        op = request.operation;
      let patches: Parameters<typeof applyPatches>[2] | null = null,
        label = '',
        kind: 'edit' | 'preset' | 'audit' = 'edit';
      if (op.type === 'edit') {
        patches = [op.patch];
        label = 'Tokenszerkesztés';
      }
      if (op.type === 'preset') {
        patches = spacingPreset(next.draft, op.name);
        label = `Spacing · ${op.name}`;
        kind = 'preset';
      }
      if (op.type === 'accept' || op.type === 'reject') {
        const finding = view.findings.find((f) => f.id === op.findingId);
        if (!finding?.proposal || finding.decision === 'rejected')
          throw new Error('PROPOSAL_STALE_OR_INVALID');
        if (op.type === 'reject') next.rejected.push(finding.id);
        else {
          patches = [finding.proposal];
          label = `Audit-javítás · ${finding.target}`;
          kind = 'audit';
        }
      }
      if (patches) {
        const after = applyPatches(
          this.options.manifest,
          next.draft,
          patches,
          this.options.componentTokenIds,
        );
        const changes = changesBetween(next.draft, after);
        if (changes.length) {
          const previous = next.history[next.cursor - 1];
          const gestureId = op.type === 'edit' ? op.gestureId : undefined;
          const merge =
            gestureId &&
            next.cursor === next.history.length &&
            previous?.kind === 'edit' &&
            previous.gestureId === gestureId &&
            previous.changes.length === 1 &&
            changes.length === 1 &&
            previous.changes[0]!.tokenId === changes[0]!.tokenId &&
            previous.changes[0]!.responsive === changes[0]!.responsive;
          next.history = next.history.slice(0, next.cursor);
          if (merge) {
            previous.after = after;
            previous.changes = changesBetween(previous.before, after);
            if (!previous.changes.length) next.history.pop();
          } else
            next.history.push({
              id: request.requestId,
              label,
              kind,
              at: new Date().toISOString(),
              before: next.draft,
              after,
              changes,
              ...(gestureId ? { gestureId } : {}),
            });
          next.cursor = next.history.length;
          next.draft = after;
        }
      }
      if (op.type === 'undo') {
        if (!next.cursor) throw new Error('UNDO_EMPTY');
        next.draft = next.history[--next.cursor]!.before;
      }
      if (op.type === 'redo') {
        if (next.cursor >= next.history.length) throw new Error('REDO_EMPTY');
        next.draft = next.history[next.cursor++]!.after;
      }
      if (op.type === 'qa') {
        if (this.job) throw new Error('QA_BUSY');
        const context = view.context;
        next.qa = {
          id: randomUUID(),
          level: op.level,
          context,
          status: 'NOT_RUN',
          running: true,
          startedAt: new Date().toISOString(),
          checks: [],
        };
      }
      next.revision++;
      next.receipts = [...next.receipts, request.requestId].slice(-512);
      if (op.type === 'approve') {
        if (
          !op.confirmed ||
          op.configurationDigest !== view.context.configurationDigest ||
          op.runId !== view.state.qa?.id ||
          !canApprove(view.state.qa, view.context) ||
          view.findings.some(
            (f) => f.severity === 'blocker' && f.status !== 'PASS',
          )
        )
          throw new Error(
            'APPROVAL_QA_REQUIRED: aktuális, teljes Approval QA és kifejezett jóváhagyás szükséges.',
          );
        const generated = unwrap(generateTokens(next.draft));
        const [css, typescript] = await Promise.all([
          format(generated.css, {
            parser: 'css',
            singleQuote: true,
            trailingComma: 'all',
          }),
          format(generated.typescript, {
            parser: 'typescript',
            singleQuote: true,
            trailingComma: 'all',
          }),
        ]);
        next.baseline = {
          config: structuredClone(next.draft),
          context: view.context,
          createdAt: new Date().toISOString(),
          approval: {
            id: request.requestId,
            confirmed: true,
            approvedAt: new Date().toISOString(),
            run: view.state.qa!,
          },
        };
        next.authority = {
          contractDigest: view.context.contractDigest,
          structureDigest: view.context.structureDigest,
          tokenSourceDigest: digest(next.draft),
          sourceRevision: view.context.sourceRevision,
          environment: view.context.environment,
        };
        // Recheck immediately before preparing any authoritative write.
        if (!sameContext((await this.view()).context, view.context))
          throw new Error('APPROVAL_CONTEXT_CHANGED');
        try {
          await this.storage.transaction({
            tokens: JSON.stringify(next.draft, null, 2) + '\n',
            css,
            ts: typescript,
            state: encodeState(next),
          });
        } catch (error) {
          if ((error as Error).message.includes('RECOVERY_'))
            this.fatal = String(error);
          throw error;
        }
      } else {
        try {
          await this.storage.save(next);
        } catch (error) {
          await this.checkSavedState();
          throw error;
        }
      }
      this.state = next;
      if (op.type === 'qa')
        this.launchQa(structuredClone(next.qa!), structuredClone(next.draft));
      return this.view();
    });
  }
  private launchQa(run: QualityRun, config: EditableTokenConfig) {
    this.progress = undefined;
    this.job = (async () => {
      let checks: QualityEvidence[];
      try {
        checks = await this.options.runQa(
          config,
          run.context,
          run.level,
          changesBetween(
            (this.state.baseline ?? this.state.initial).config,
            config,
          ).map((c) => c.tokenId),
          (progress) => {
            this.progress = progress;
          },
        );
      } catch (error) {
        checks = [this.errorCheck(run.context, String(error))];
      }
      await this.serial(async () => {
        try {
          await this.checkSavedState();
        } catch {
          return;
        }
        const next = structuredClone(this.state);
        if (next.qa?.id !== run.id) return;
        const current = await this.view();
        next.qa = {
          ...run,
          running: false,
          finishedAt: new Date().toISOString(),
          checks,
          status:
            current.compatibility !== 'conflict' &&
            sameDesignContext(run.context, current.context)
              ? runStatus(checks)
              : 'STALE',
        };
        next.revision++;
        try {
          await this.storage.save(next);
          this.state = next;
        } catch (error) {
          this.fatal = `QA_SAVE_ERROR: ${String(error)}; indítsd újra a Labot. A QA nem használható jóváhagyásra.`;
        }
      });
    })().finally(() => {
      this.job = null;
    });
  }
  async waitQa() {
    await this.job;
  }
}
