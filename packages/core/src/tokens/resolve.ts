import { z } from 'zod';
import { validateManifest } from '../contracts/manifest.ts';
import { CARD_PADDING_PX, FOUNDATION_RULES, SPACING_PX } from '@wdf/foundation';
import { fromSchema, type Diagnostic, type Result } from '../diagnostics.ts';
import {
  editableTokenConfigSchema,
  tokenIdSchema,
  tokenScopeSchema,
  tokenSchema,
  type EditableTokenConfig,
  literalSchemas,
  tokenConfigSchema,
  type Token,
  type TokenConfig,
  type TokenType,
  type TokenValue,
} from './schema.ts';
export interface ResolvedToken {
  type: TokenType;
  value: string | number;
}
export interface ResolvedTokens {
  config: TokenConfig;
  base: Record<string, ResolvedToken>;
  responsive: {
    name: string;
    minWidth: number;
    tokens: Record<string, ResolvedToken>;
  }[];
}
export function foundationTokens(): Record<string, ResolvedToken> {
  return Object.fromEntries([
    ...SPACING_PX.map((px) => [
      `foundation.spacing.${px}`,
      { type: 'spacing' as const, value: px },
    ]),
    ...Object.entries(CARD_PADDING_PX).map(([name, px]) => [
      `foundation.card.${name}`,
      { type: 'spacing' as const, value: px },
    ]),
  ]);
}
export function sameScope(a: Token['scope'], b: Token['scope']): boolean {
  return (
    a.kind === b.kind &&
    (a.kind === 'global' ||
      (b.kind !== 'global' &&
        a.family === b.family &&
        (a.kind !== 'variant' ||
          (b.kind === 'variant' && a.variant === b.variant))))
  );
}
export function mayReference(
  sourceId: string,
  source: Pick<Token, 'scope'>,
  targetId: string,
  target: Pick<Token, 'scope'> | undefined,
): boolean {
  if (targetId.startsWith('foundation.')) return true;
  if (!target) return false;
  const layer = (id: string) =>
    id.startsWith('primitive.') ? 1 : id.startsWith('semantic.') ? 2 : 3;
  if (layer(targetId) > layer(sourceId)) return false;
  if (target.scope.kind === 'global') return true;
  if (
    source.scope.kind === 'global' ||
    source.scope.family !== target.scope.family
  )
    return false;
  return (
    target.scope.kind === 'family' || sameScope(source.scope, target.scope)
  );
}
/** Metadata must identify an unambiguous, permitted editing owner even during repair. */
function tokenOwnershipDiagnostics(
  tokens: Record<string, Pick<Token, 'scope'>>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const fail = (code: string, path: string, message: string, ruleId?: string) =>
    diagnostics.push({
      code,
      phase: 'tokens',
      path,
      message,
      ...(ruleId ? { ruleId } : {}),
    });
  for (const [id, token] of Object.entries(tokens)) {
    const segments = id.split('.');
    if (id.startsWith('foundation.'))
      fail(
        'FOUNDATION_OVERRIDE',
        id,
        'Foundation is immutable.',
        'WDF-FOUNDATION-001',
      );
    else if (
      !['primitive', 'semantic', 'component'].includes(segments[0] ?? '')
    )
      fail(
        'TOKEN_NAMESPACE',
        id,
        'Use primitive.*, semantic.* or component.*.',
      );
    else if (segments[0] === 'component') {
      const scope = token.scope;
      if (
        scope.kind === 'global' ||
        segments[1] !== scope.family ||
        (scope.kind === 'family'
          ? segments.length !== 3
          : segments.length !== 4 || segments[2] !== scope.variant)
      )
        fail(
          'TOKEN_SCOPE',
          id,
          'Component ID must match its family/variant scope.',
          'WDF-SCOPE-001',
        );
    } else if (token.scope.kind !== 'global')
      fail(
        'TOKEN_SCOPE',
        id,
        'Primitives and semantic tokens require global scope.',
        'WDF-SCOPE-001',
      );
  }
  return diagnostics;
}
export function resolveTokens(input: unknown): Result<ResolvedTokens> {
  const parsed = fromSchema(tokenConfigSchema, input);
  if (!parsed.ok) return parsed;
  const config = parsed.value;
  const diagnostics: Diagnostic[] = [];
  const fail = (
    code: string,
    path: string,
    message: string,
    ruleId?: string,
    related?: string[],
  ) =>
    diagnostics.push({
      code,
      phase: 'tokens',
      path,
      message,
      ...(ruleId ? { ruleId } : {}),
      ...(related ? { related } : {}),
    });
  diagnostics.push(...tokenOwnershipDiagnostics(config.tokens));
  for (const [id, token] of Object.entries(config.tokens)) {
    if (token.role === 'card-padding' && token.type !== 'spacing')
      fail(
        'CARD_PADDING_TYPE',
        id,
        'Card padding must be a spacing token.',
        'WDF-CARD-001',
      );
  }
  const exceptionIds = new Set<string>();
  for (const e of config.exceptions ?? []) {
    if (exceptionIds.has(e.id))
      fail('EXCEPTION_DUPLICATE', e.id, 'Exception IDs must be unique.');
    exceptionIds.add(e.id);
    const rule = FOUNDATION_RULES.find((r) => r.id === e.ruleId);
    if (!rule || rule.category !== 'WDF LOCKED')
      fail(
        'EXCEPTION_RULE_FORBIDDEN',
        e.id,
        'Only a known WDF LOCKED rule may receive an exception request.',
      );
    for (const id of e.tokenIds)
      if (!Object.hasOwn(config.tokens, id))
        fail('EXCEPTION_TARGET_UNKNOWN', e.id, `Unknown target ${id}.`);
  }
  const breakpoints = Object.entries(config.responsive ?? {}).sort(
    ([a, x], [b, y]) => x.minWidth - y.minWidth || (a < b ? -1 : a > b ? 1 : 0),
  );
  if (
    new Set(breakpoints.map(([, r]) => r.minWidth)).size !== breakpoints.length
  )
    fail(
      'RESPONSIVE_AMBIGUOUS',
      '$.responsive',
      'Responsive minWidth values must be unique.',
      'WDF-RESPONSIVE-001',
    );
  function resolveGraph(
    overrides: Record<string, TokenValue>,
    location: string,
  ): Record<string, ResolvedToken> {
    const resolved = foundationTokens();
    const visiting: string[] = [];
    const failed = new Set<string>();
    for (const id of Object.keys(overrides)) {
      if (id.startsWith('foundation.'))
        fail(
          'FOUNDATION_OVERRIDE',
          `${location}.${id}`,
          'Responsive rules cannot overwrite Foundation.',
          'WDF-FOUNDATION-001',
        );
      else if (!Object.hasOwn(config.tokens, id))
        fail(
          'RESPONSIVE_TARGET_UNKNOWN',
          `${location}.${id}`,
          'Responsive override must target an existing project token.',
          'WDF-RESPONSIVE-001',
        );
    }
    function visit(id: string): ResolvedToken | undefined {
      if (Object.hasOwn(resolved, id)) return resolved[id];
      if (failed.has(id)) return undefined;
      const token = config.tokens[id];
      if (!token) return undefined;
      if (visiting.includes(id)) {
        fail(
          'TOKEN_CYCLE',
          `${location}.${id}`,
          'Circular token dependency.',
          undefined,
          [...visiting.slice(visiting.indexOf(id)), id],
        );
        failed.add(id);
        return undefined;
      }
      visiting.push(id);
      const value = Object.hasOwn(overrides, id) ? overrides[id] : token.value;
      let result: ResolvedToken | undefined;
      if (typeof value === 'object' && value !== null) {
        const target = config.tokens[value.ref];
        const foundation =
          Object.hasOwn(resolved, value.ref) &&
          value.ref.startsWith('foundation.');
        if (!target && !foundation)
          fail(
            'TOKEN_REFERENCE_UNKNOWN',
            `${location}.${id}`,
            `Unknown reference ${value.ref}.`,
            undefined,
            [value.ref],
          );
        else if (!mayReference(id, token, value.ref, target))
          fail(
            'TOKEN_REFERENCE_SCOPE',
            `${location}.${id}`,
            `Reference to ${value.ref} crosses the permitted layer/scope.`,
            'WDF-SCOPE-001',
            [value.ref],
          );
        else {
          const dependency = visit(value.ref);
          if (dependency) {
            if (dependency.type !== token.type)
              fail(
                'TOKEN_REFERENCE_TYPE',
                `${location}.${id}`,
                `Expected ${token.type}, received ${dependency.type} from ${value.ref}.`,
                undefined,
                [value.ref],
              );
            else result = { ...dependency };
          }
        }
      } else {
        const checked = literalSchemas[token.type].safeParse(value);
        if (!checked.success)
          fail(
            'TOKEN_VALUE_TYPE',
            `${location}.${id}`,
            `Invalid ${token.type} value: ${checked.error.issues.map((i) => i.message).join('; ')}`,
          );
        else result = { type: token.type, value: checked.data };
      }
      if (
        result?.type === 'spacing' &&
        !(SPACING_PX as readonly unknown[]).includes(result.value)
      ) {
        fail(
          'SPACING_OUT_OF_SCALE',
          `${location}.${id}`,
          `Spacing ${result.value}px is outside the Foundation scale.`,
          'WDF-SPACING-001',
        );
        result = undefined;
      }
      if (
        result &&
        token.role === 'card-padding' &&
        !(Object.values(CARD_PADDING_PX) as unknown[]).includes(result.value)
      ) {
        fail(
          'CARD_PADDING_INVALID',
          `${location}.${id}`,
          'Card padding must resolve to 16, 24 or 32 reference px.',
          'WDF-CARD-001',
        );
        result = undefined;
      }
      visiting.pop();
      if (result) resolved[id] = result;
      else failed.add(id);
      return result;
    }
    for (const id of Object.keys(config.tokens).sort()) visit(id);
    return Object.fromEntries(
      Object.entries(resolved).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  }
  const base = resolveGraph({}, '$.tokens');
  const cumulative: Record<string, TokenValue> = {};
  const responsive = breakpoints.map(([name, r]) => {
    Object.assign(cumulative, r.overrides);
    return {
      name,
      minWidth: r.minWidth,
      tokens: resolveGraph(cumulative, `$.responsive.${name}`),
    };
  });
  return diagnostics.length
    ? { ok: false, diagnostics }
    : { ok: true, value: { config, base, responsive } };
}
export interface TokenEdit {
  /** Candidate only. An accepted edit is not proof of token validity. */
  config: EditableTokenConfig;
  validation: Result<ResolvedTokens>;
}
export interface TokenEditOptions {
  /** Existing explicit responsive rule; omitted means base token values. */
  responsive?: string;
}
/** Pure, Manifest-gated repair primitive. Remaining token errors are reported, not edit blockers. */
export function updateTokensInScope(
  manifest: unknown,
  input: unknown,
  scope: Token['scope'],
  changes: Record<string, TokenValue>,
  options: TokenEditOptions = {},
): Result<TokenEdit> {
  const contract = validateManifest(manifest);
  if (!contract.ok) return contract;
  const parsed = fromSchema(editableTokenConfigSchema, input);
  if (!parsed.ok) return parsed;
  const owner = fromSchema(tokenScopeSchema, scope, '$.scope');
  if (!owner.ok) return owner;
  const target = fromSchema(
    z.strictObject({ responsive: z.string().optional() }),
    options,
    '$.options',
  );
  if (!target.ok) return target;
  const patch = fromSchema(
    z.record(tokenIdSchema, z.json()),
    changes,
    '$.changes',
  );
  if (!patch.ok) return patch;
  const ownership = tokenOwnershipDiagnostics(parsed.value.tokens);
  if (ownership.length) return { ok: false, diagnostics: ownership };
  const next = structuredClone(parsed.value);
  const breakpoint = target.value.responsive;
  const overrides =
    breakpoint === undefined
      ? undefined
      : next.responsive?.[breakpoint]?.overrides;
  if (breakpoint !== undefined && !overrides)
    return {
      ok: false,
      diagnostics: [
        {
          code: 'EDIT_RESPONSIVE_UNDECLARED',
          phase: 'tokens',
          path: '$.options.responsive',
          message: 'A responsive edit must name an existing explicit rule.',
          ruleId: 'WDF-RESPONSIVE-001',
        },
      ],
    };
  for (const [id, value] of Object.entries(patch.value)) {
    const token = next.tokens[id];
    if (
      !token ||
      !sameScope(owner.value, token.scope) ||
      (overrides && !Object.hasOwn(overrides, id))
    )
      return {
        ok: false,
        diagnostics: [
          {
            code: 'EDIT_SCOPE_FORBIDDEN',
            phase: 'tokens',
            path: id,
            message:
              'Edit only existing values in the exact scope and declared responsive target.',
            ruleId: 'WDF-SCOPE-001',
          },
        ],
      };
    const checked = fromSchema(
      tokenSchema,
      { ...token, value },
      `$.changes[${JSON.stringify(id)}]`,
    );
    if (!checked.ok) return checked;
    const updated = checked.value;
    const fail = (
      code: string,
      message: string,
      ruleId?: string,
    ): Result<TokenEdit> => ({
      ok: false,
      diagnostics: [
        {
          code,
          phase: 'tokens',
          path: id,
          message,
          ...(ruleId ? { ruleId } : {}),
        },
      ],
    });
    if (updated.role === 'card-padding' && updated.type !== 'spacing')
      return fail(
        'CARD_PADDING_TYPE',
        'Card padding must be a spacing token.',
        'WDF-CARD-001',
      );
    if (typeof updated.value === 'object') {
      const ref = updated.value.ref;
      const dependency = next.tokens[ref];
      const foundation = foundationTokens()[ref];
      if (!dependency && !foundation)
        return fail('TOKEN_REFERENCE_UNKNOWN', `Unknown reference ${ref}.`);
      if (!mayReference(id, updated, ref, dependency))
        return fail(
          'TOKEN_REFERENCE_SCOPE',
          `Reference to ${ref} crosses the permitted layer/scope.`,
          'WDF-SCOPE-001',
        );
      if ((dependency ?? foundation)?.type !== updated.type)
        return fail(
          'TOKEN_REFERENCE_TYPE',
          `Reference ${ref} must have type ${updated.type}.`,
        );
    } else {
      if (
        updated.type === 'spacing' &&
        !(SPACING_PX as readonly unknown[]).includes(updated.value)
      )
        return fail(
          'SPACING_OUT_OF_SCALE',
          `Spacing ${updated.value}px is outside the Foundation scale.`,
          'WDF-SPACING-001',
        );
      if (
        updated.role === 'card-padding' &&
        !(Object.values(CARD_PADDING_PX) as unknown[]).includes(updated.value)
      )
        return fail(
          'CARD_PADDING_INVALID',
          'Card padding must resolve to 16, 24 or 32 reference px.',
          'WDF-CARD-001',
        );
    }
    if (overrides) overrides[id] = structuredClone(updated.value);
    else token.value = structuredClone(updated.value);
  }
  return { ok: true, value: { config: next, validation: resolveTokens(next) } };
}
