import { z } from 'zod';
import {
  editableTokenConfigSchema,
  tokenScopeSchema,
  type EditableTokenConfig,
} from '../tokens/schema.ts';
import { resolveTokens, updateTokensInScope } from '../tokens/resolve.ts';
import type { ProjectManifest } from '../contracts/manifest.ts';
import type { QualityEvidence, QualityStatus } from '../quality/index.ts';

export const CHANGE_VERSION = '1.0.0';
export const REQUIRED_APPROVAL_CHECKS = [
  'WDF-TOKENS',
  'WDF-REGISTRY',
  'WDF-BROWSER-MATRIX',
  'STD-A11Y-001',
  'STD-KEYBOARD-001',
  'WDF-GEOMETRY',
  'WDF-TYPE-001',
] as const;
export const patchSchema = z.strictObject({
  scope: tokenScopeSchema,
  changes: z
    .record(
      z.string().min(1),
      z.union([
        z.string(),
        z.number().finite(),
        z.strictObject({ ref: z.string() }),
      ]),
    )
    .refine((v) => Object.keys(v).length > 0),
  responsive: z.string().min(1).optional(),
});
export type DesignPatch = z.infer<typeof patchSchema>;
export const operationSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('edit'),
    patch: patchSchema,
    gestureId: z.uuid().optional(),
  }),
  z.strictObject({
    type: z.literal('preset'),
    name: z.enum(['compact', 'comfortable', 'spacious']),
  }),
  z.strictObject({ type: z.literal('undo') }),
  z.strictObject({ type: z.literal('redo') }),
  z.strictObject({ type: z.literal('accept'), findingId: z.string() }),
  z.strictObject({ type: z.literal('reject'), findingId: z.string() }),
  z.strictObject({
    type: z.literal('qa'),
    level: z.enum(['targeted', 'approval']),
  }),
  z.strictObject({
    type: z.literal('approve'),
    runId: z.string(),
    configurationDigest: z.string(),
    confirmed: z.literal(true),
  }),
]);
export type ChangeOperation = z.infer<typeof operationSchema>;
export const requestSchema = z.strictObject({
  version: z.literal(CHANGE_VERSION),
  projectId: z.string(),
  session: z.string(),
  requestId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  operation: operationSchema,
});
export const identitySchema = z.strictObject({
  contractDigest: z.string(),
  structureDigest: z.string(),
  tokenSourceDigest: z.string(),
  sourceRevision: z.string(),
  environment: z.string(),
});
export type SourceIdentity = z.infer<typeof identitySchema>;
export const contextSchema = identitySchema.extend({
  configurationDigest: z.string(),
});
export type QualityContext = z.infer<typeof contextSchema>;
export const checkSchema = z.strictObject({
  id: z.string(),
  ruleId: z.string(),
  severity: z.enum(['blocker', 'warning', 'suggestion']),
  status: z.enum(['PASS', 'FAIL', 'ERROR', 'NOT_RUN', 'STALE']),
  target: z.string(),
  description: z.string(),
  evidence: z.array(z.string()),
  configurationDigest: z.string(),
  sourceRevision: z.string(),
  environment: z.string(),
});
export const runSchema = z.strictObject({
  id: z.string(),
  level: z.enum(['targeted', 'approval']),
  context: contextSchema,
  status: z.enum(['PASS', 'FAIL', 'ERROR', 'NOT_RUN', 'STALE']),
  running: z.boolean(),
  progress: z
    .strictObject({
      completed: z.number().int().nonnegative(),
      total: z.number().int().positive(),
      current: z.string(),
    })
    .optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  checks: z.array(checkSchema),
});
export type QualityRun = z.infer<typeof runSchema>;
const snapshotSchema = z.strictObject({
  config: editableTokenConfigSchema,
  context: contextSchema,
  createdAt: z.string(),
});
export const historySchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  at: z.string(),
  kind: z.enum(['edit', 'preset', 'audit']),
  gestureId: z.uuid().optional(),
  before: editableTokenConfigSchema,
  after: editableTokenConfigSchema,
  changes: z.array(
    z.strictObject({
      tokenId: z.string(),
      scope: tokenScopeSchema,
      responsive: z.string().optional(),
      before: z.json(),
      after: z.json(),
    }),
  ),
});
export type HistoryEntry = z.infer<typeof historySchema>;
export const stateSchema = z.strictObject({
  version: z.literal(CHANGE_VERSION),
  projectId: z.string(),
  contractVersion: z.string(),
  revision: z.number().int().nonnegative(),
  authority: identitySchema,
  initial: snapshotSchema,
  baseline: snapshotSchema
    .extend({
      approval: z.strictObject({
        id: z.string(),
        confirmed: z.literal(true),
        approvedAt: z.string(),
        run: runSchema,
      }),
    })
    .nullable(),
  draft: editableTokenConfigSchema,
  history: z.array(historySchema),
  cursor: z.number().int().nonnegative(),
  rejected: z.array(z.string()),
  qa: runSchema.nullable(),
  receipts: z.array(z.string()),
});
export type ChangeState = z.infer<typeof stateSchema>;
export interface AuditFinding extends QualityEvidence {
  proposal?: DesignPatch;
  decision?: 'rejected';
}
export interface ChangeView {
  state: ChangeState;
  context: QualityContext;
  findings: AuditFinding[];
  compatibility: 'compatible' | 'source-changed' | 'conflict';
  diagnostic: string;
  referenceCompatible: boolean;
  referenceStale: boolean;
  saveLocation: string;
}

export function applyPatches(
  manifest: ProjectManifest,
  config: EditableTokenConfig,
  patches: DesignPatch[],
  allowed: readonly string[],
) {
  let next = config;
  for (const patch of patches) {
    for (const id of Object.keys(patch.changes))
      if (patch.scope.kind !== 'global' && !allowed.includes(id))
        throw new Error(`EDIT_REGISTRY_FORBIDDEN: ${id}`);
    const result = updateTokensInScope(
      manifest,
      next,
      patch.scope,
      patch.changes,
      patch.responsive ? { responsive: patch.responsive } : {},
    );
    if (!result.ok)
      throw new Error(
        result.diagnostics
          .map((d) => `${d.code} ${d.path}: ${d.message}`)
          .join('\n'),
      );
    next = result.value.config;
  }
  return next;
}

export function changesBetween(
  before: EditableTokenConfig,
  after: EditableTokenConfig,
): HistoryEntry['changes'] {
  const changes: HistoryEntry['changes'] = [];
  for (const [id, token] of Object.entries(after.tokens)) {
    const previous = before.tokens[id];
    if (!previous) throw new Error('HISTORY_STRUCTURE_CHANGED');
    if (JSON.stringify(previous.value) !== JSON.stringify(token.value))
      changes.push({
        tokenId: id,
        scope: token.scope,
        before: previous.value,
        after: token.value,
      });
    for (const [name, rule] of Object.entries(after.responsive ?? {})) {
      const a = before.responsive?.[name]?.overrides[id],
        b = rule.overrides[id];
      if (
        a !== undefined &&
        b !== undefined &&
        JSON.stringify(a) !== JSON.stringify(b)
      )
        changes.push({
          tokenId: id,
          scope: token.scope,
          responsive: name,
          before: a,
          after: b,
        });
    }
  }
  return changes;
}

/** A category replacement covers every declared global spacing slot, including responsive slots. */
export function spacingPreset(
  config: EditableTokenConfig,
  name: 'compact' | 'comfortable' | 'spacious',
): DesignPatch[] {
  const value = { compact: 16, comfortable: 24, spacious: 32 }[name];
  const ids = Object.keys(config.tokens).filter(
    (id) =>
      config.tokens[id]?.scope.kind === 'global' &&
      config.tokens[id]?.type === 'spacing',
  );
  return [undefined, ...Object.keys(config.responsive ?? {})].flatMap(
    (responsive) => {
      const targets = ids.filter(
        (id) =>
          !responsive ||
          Object.hasOwn(config.responsive?.[responsive]?.overrides ?? {}, id),
      );
      return targets.length
        ? [
            {
              scope: { kind: 'global' as const },
              changes: Object.fromEntries(targets.map((id) => [id, value])),
              ...(responsive ? { responsive } : {}),
            },
          ]
        : [];
    },
  );
}

export function liveAudit(
  manifest: ProjectManifest,
  config: EditableTokenConfig,
  context: QualityContext,
): AuditFinding[] {
  const result = resolveTokens(config);
  const common = {
    configurationDigest: context.configurationDigest,
    sourceRevision: context.sourceRevision,
    environment: context.environment,
  };
  if (result.ok)
    return [
      {
        ...common,
        id: `live:${context.configurationDigest}:valid`,
        ruleId: 'WDF-TOKENS',
        severity: 'suggestion',
        status: 'PASS',
        target: 'Working Draft',
        description:
          'A Contract tokenértékei és Foundation-szabályai érvényesek.',
        evidence: [
          `${Object.keys(config.tokens).length} token; minden deklarált responsive gráf feloldva.`,
        ],
      },
    ];
  return result.diagnostics.map((d, i) => {
    const id = Object.keys(config.tokens)
      .sort((a, b) => b.length - a.length)
      .find((id) => d.path.includes(id));
    const finding: AuditFinding = {
      ...common,
      id: `live:${context.configurationDigest}:${context.sourceRevision}:${context.environment}:${i}`,
      ruleId: d.ruleId ?? d.code,
      severity: 'blocker',
      status: 'FAIL',
      target: id ?? d.path,
      description: d.message,
      evidence: [
        `${d.code}: ${d.path}`,
        `Ellenőrzés: Core resolveTokens; érték: ${JSON.stringify(id ? config.tokens[id]?.value : null)}`,
      ],
    };
    if (
      id &&
      ['SPACING_OUT_OF_SCALE', 'CARD_PADDING_INVALID'].includes(d.code)
    ) {
      const token = config.tokens[id]!;
      const responsive = Object.keys(config.responsive ?? {}).find((name) =>
        d.path.startsWith(`$.responsive.${name}.`),
      );
      // Core resolves cumulative responsive graphs. Repair the actual declared owner,
      // including an inherited tablet value reported again at desktop.
      const target = responsive
        ? Object.entries(config.responsive ?? {})
            .filter(
              ([, rule]) =>
                rule.minWidth <=
                  (config.responsive?.[responsive]?.minWidth ?? 0) &&
                Object.hasOwn(rule.overrides, id),
            )
            .sort((a, b) => a[1].minWidth - b[1].minWidth)
            .at(-1)?.[0]
        : undefined;
      const raw = target
        ? config.responsive?.[target]?.overrides[id]
        : token.value;
      const scale =
        token.role === 'card-padding'
          ? [16, 24, 32]
          : [0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80];
      const value = scale.reduce(
        (a, b) =>
          Math.abs(b - Number(raw)) < Math.abs(a - Number(raw)) ? b : a,
        16,
      );
      const patch: DesignPatch = {
        scope: token.scope,
        changes: { [id]: value },
        ...(target ? { responsive: target } : {}),
      };
      try {
        applyPatches(manifest, config, [patch], [id]);
        finding.proposal = patch;
      } catch {
        /* Source fixes remain diagnostics. */
      }
    }
    return finding;
  });
}

export function runStatus(checks: QualityEvidence[]): QualityStatus {
  if (!checks.length) return 'NOT_RUN';
  for (const status of ['ERROR', 'NOT_RUN', 'STALE', 'FAIL'] as const)
    if (checks.some((c) => c.status === status)) return status;
  return 'PASS';
}
export function sameContext(a: QualityContext, b: QualityContext) {
  return Object.keys(a).every(
    (k) => a[k as keyof QualityContext] === b[k as keyof QualityContext],
  );
}
/** Publishing the tested Draft changes the old token-source digest, not the rendered QA input. External authority changes are separately conflicts. */
export function sameDesignContext(a: QualityContext, b: QualityContext) {
  return Object.keys(a)
    .filter((k) => k !== 'tokenSourceDigest')
    .every(
      (k) => a[k as keyof QualityContext] === b[k as keyof QualityContext],
    );
}
export function canApprove(run: QualityRun | null, context: QualityContext) {
  return (
    !!run &&
    run.level === 'approval' &&
    !run.running &&
    run.status === 'PASS' &&
    sameDesignContext(run.context, context) &&
    REQUIRED_APPROVAL_CHECKS.every((id) =>
      run.checks.some((c) => c.ruleId === id),
    ) &&
    run.checks.every(
      (c) =>
        c.status === 'PASS' &&
        c.configurationDigest === context.configurationDigest &&
        c.sourceRevision === context.sourceRevision &&
        c.environment === context.environment,
    )
  );
}
