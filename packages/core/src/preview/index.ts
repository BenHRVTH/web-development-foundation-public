import { z } from 'zod';
import { fromSchema, type Result } from '../diagnostics.ts';
import { updateTokensInScope, type TokenEdit } from '../tokens/resolve.ts';
import {
  literalSchemas,
  tokenIdSchema,
  tokenScopeSchema,
  type EditableTokenConfig,
} from '../tokens/schema.ts';

export const PREVIEW_VERSION = '1.1.0';
export const PREVIEW_WIDTHS = [320, 390, 768, 1024, 1440] as const;
const value = z.union([
  ...Object.values(literalSchemas),
  z.strictObject({ ref: tokenIdSchema }),
]);
export const globalEditSchema = z.strictObject({
  id: tokenIdSchema,
  value,
  responsive: z.string().min(1).optional(),
});
export const designEditSchema = globalEditSchema.extend({
  scope: tokenScopeSchema,
});
export type DesignEdit = z.infer<typeof designEditSchema>;
export type GlobalEdit = z.infer<typeof globalEditSchema>;
const envelope = {
  channel: z.literal('wdf-preview'),
  version: z.literal(PREVIEW_VERSION),
  projectId: z.string().min(1),
  session: z.string().regex(/^[a-f0-9]{64}$/),
};
const canvasColor = z.string().regex(/^rgba?\([\d.,\s%]+\)$/);
export const previewRequestSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...envelope, type: z.literal('connect') }),
  z.strictObject({ ...envelope, type: z.literal('ping') }),
  z.strictObject({
    ...envelope,
    type: z.literal('apply-design'),
    revision: z.number().int().positive(),
    edits: z.array(designEditSchema).max(4096),
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('apply'),
    revision: z.number().int().positive(),
    edits: z.array(globalEditSchema).max(4096),
  }),
]);
export const previewResponseSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...envelope,
    type: z.literal('ready'),
    revision: z.number().int().nonnegative(),
    canvasColor,
  }),
  z.strictObject({ ...envelope, type: z.literal('pong') }),
  z.strictObject({
    ...envelope,
    type: z.literal('applied'),
    revision: z.number().int().positive(),
    canvasColor,
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('error'),
    code: z.string().min(1),
    message: z.string().min(1),
    revision: z.number().int().nonnegative(),
  }),
]);
export type PreviewRequest = z.infer<typeof previewRequestSchema>;
export type PreviewResponse = z.infer<typeof previewResponseSchema>;
export interface PreviewIdentity {
  projectId: string;
  session: string;
}
export interface PreviewConnection extends PreviewIdentity {
  labOrigin: string;
  previewOrigin: string;
}
export function previewEnvelope(identity: PreviewIdentity) {
  return {
    channel: 'wdf-preview' as const,
    version: PREVIEW_VERSION,
    projectId: identity.projectId,
    session: identity.session,
  } as const;
}
/** Check sender before parsing data. A valid payload alone is never authentication. */
export function isPreviewPeer(
  event: Pick<MessageEvent, 'source' | 'origin'>,
  expectedSource: MessageEventSource | null,
  expectedOrigin: string,
): boolean {
  return (
    expectedSource !== null &&
    event.source === expectedSource &&
    event.origin === expectedOrigin
  );
}
export function matchesPreviewIdentity(
  message: PreviewIdentity,
  identity: PreviewIdentity,
) {
  return (
    message.projectId === identity.projectId &&
    message.session === identity.session
  );
}
/** All changes are applied to a copy. Only existing global value slots are writable. */
export function applyGlobalEdits(
  manifest: unknown,
  input: unknown,
  edits: readonly GlobalEdit[],
): Result<TokenEdit> {
  const parsed = fromSchema(z.array(globalEditSchema).max(4096), edits);
  if (!parsed.ok) return parsed;
  let result = updateTokensInScope(manifest, input, { kind: 'global' }, {});
  if (!result.ok) return result;
  const seen = new Set<string>();
  for (const edit of parsed.value) {
    const key = JSON.stringify([edit.responsive, edit.id]);
    if (seen.has(key))
      return {
        ok: false,
        diagnostics: [
          {
            code: 'PREVIEW_EDIT_DUPLICATE',
            phase: 'tokens',
            path: edit.id,
            message: 'An edit may target each global value slot only once.',
          },
        ],
      };
    seen.add(key);
    result = updateTokensInScope(
      manifest,
      result.value.config,
      { kind: 'global' },
      { [edit.id]: edit.value },
      edit.responsive === undefined ? {} : { responsive: edit.responsive },
    );
    if (!result.ok) return result;
  }
  return result;
}
/** Snapshot of declared global values; metadata, Foundation and components never cross. */
export function globalEdits(config: EditableTokenConfig): GlobalEdit[] {
  const edits: unknown[] = [];
  for (const [id, token] of Object.entries(config.tokens)) {
    if (token.scope.kind === 'global') edits.push({ id, value: token.value });
  }
  for (const [responsive, rule] of Object.entries(config.responsive ?? {})) {
    for (const [id, value] of Object.entries(rule.overrides))
      if (config.tokens[id]?.scope.kind === 'global')
        edits.push({ id, value, responsive });
  }
  return z.array(globalEditSchema).parse(edits);
}

/** Trusted Registry allowlist is supplied by the adapter, never by the message sender. */
export function applyDesignEdits(
  manifest: unknown,
  input: unknown,
  edits: readonly DesignEdit[],
  componentTokenIds: readonly string[],
): Result<TokenEdit> {
  const parsed = fromSchema(z.array(designEditSchema).max(4096), edits);
  if (!parsed.ok) return parsed;
  let result = updateTokensInScope(manifest, input, { kind: 'global' }, {});
  if (!result.ok) return result;
  const seen = new Set<string>();
  for (const edit of parsed.value) {
    const key = JSON.stringify([edit.responsive, edit.id]);
    if (
      seen.has(key) ||
      (edit.scope.kind !== 'global' && !componentTokenIds.includes(edit.id))
    )
      return {
        ok: false,
        diagnostics: [
          {
            code: seen.has(key)
              ? 'PREVIEW_EDIT_DUPLICATE'
              : 'PREVIEW_SCOPE_FORBIDDEN',
            phase: 'tokens',
            path: edit.id,
            message:
              'Each value slot must be unique and component tokens must be declared by the trusted Registry.',
          },
        ],
      };
    seen.add(key);
    result = updateTokensInScope(
      manifest,
      result.value.config,
      edit.scope,
      { [edit.id]: edit.value },
      edit.responsive ? { responsive: edit.responsive } : {},
    );
    if (!result.ok) return result;
  }
  return result;
}
/** Complete authorized value snapshot; token identities and scopes remain receiver-owned. */
export function designEdits(
  config: EditableTokenConfig,
  componentTokenIds: readonly string[],
): DesignEdit[] {
  const edits: unknown[] = [];
  for (const [id, token] of Object.entries(config.tokens)) {
    if (token.scope.kind !== 'global' && !componentTokenIds.includes(id))
      continue;
    edits.push({ id, value: token.value, scope: token.scope });
    for (const [responsive, rule] of Object.entries(config.responsive ?? {}))
      if (Object.hasOwn(rule.overrides, id))
        edits.push({
          id,
          value: rule.overrides[id],
          scope: token.scope,
          responsive,
        });
  }
  return z.array(designEditSchema).max(4096).parse(edits);
}
