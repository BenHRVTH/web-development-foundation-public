import { createElement, type ComponentType, type ReactElement } from 'react';
import { z } from 'zod';
import {
  resolveTokens,
  updateTokensInScope,
  validateManifest,
  type Diagnostic,
  type Result,
} from '@wdf/core';

export interface Fixture<P> {
  id: string;
  name: string;
  variant: string;
  state: string;
  props: P;
}
export interface Registration<P extends object> {
  id: string;
  name: string;
  category: 'Primitive' | 'Composite';
  family: string;
  component: ComponentType<P>;
  propsSchema: z.ZodType<NoInfer<P>>;
  fixtureOwner?: ComponentType<{ initialProps: NoInfer<P> }>;
  variants: readonly string[];
  states: readonly string[];
  tokens: {
    family: readonly string[];
    variants: Readonly<Record<string, readonly string[]>>;
  };
  fixtures: readonly Fixture<NoInfer<P>>[];
}
/** Heterogeneous entries keep the implementation reference without erasing props to any. */
export interface RegistryEntry extends Omit<
  Registration<never>,
  'component' | 'propsSchema' | 'fixtures' | 'fixtureOwner'
> {
  component: unknown;
  fixtures: readonly Fixture<unknown>[];
  checkProps: (input: unknown) => Result<unknown>;
  renderFixture: (
    fixtureId: string,
    interactive?: boolean,
  ) => Result<ReactElement>;
}
function diagnostic(code: string, path: string, message: string): Diagnostic {
  return { code, phase: 'resolution', path, message };
}
export function defineComponent<P extends object>(
  registration: Registration<P>,
): Registration<P> & RegistryEntry {
  function checkProps(input: unknown): Result<P> {
    const parsed = registration.propsSchema.safeParse(input);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : {
          ok: false,
          diagnostics: parsed.error.issues.map((issue) =>
            diagnostic(
              'REGISTRY_PROPS_INVALID',
              `$.registry[${JSON.stringify(registration.id)}].props${issue.path.map((part) => `[${JSON.stringify(String(part))}]`).join('')}`,
              issue.message,
            ),
          ),
        };
  }
  return {
    ...registration,
    checkProps,
    renderFixture(fixtureId, interactive = false) {
      const fixture = registration.fixtures.find(
        (item) => item.id === fixtureId,
      );
      if (!fixture)
        return {
          ok: false,
          diagnostics: [
            diagnostic(
              'REGISTRY_FIXTURE_UNKNOWN',
              `$.registry[${JSON.stringify(registration.id)}].fixtures`,
              `Unknown fixture: ${fixtureId}`,
            ),
          ],
        };
      const props = checkProps(fixture.props);
      return props.ok
        ? {
            ok: true,
            value:
              interactive && registration.fixtureOwner
                ? createElement(registration.fixtureOwner, {
                    initialProps: props.value,
                  })
                : createElement(registration.component, props.value),
          }
        : props;
    },
  };
}
const slug = z.string().regex(/^[a-z][a-z0-9-]*$/);
const entrySchema = z.object({
  id: slug,
  name: z.string().trim().min(1),
  category: z.enum(['Primitive', 'Composite']),
  family: slug,
  component: z.custom(
    (value) => typeof value === 'function',
    'Expected a React function or class component.',
  ),
  checkProps: z.custom<(input: unknown) => Result<unknown>>(
    (value) => typeof value === 'function',
  ),
  renderFixture: z.custom<(id: string) => Result<ReactElement>>(
    (value) => typeof value === 'function',
  ),
  variants: z.array(slug).min(1),
  states: z.array(slug).min(1),
  tokens: z.object({
    family: z.array(z.string()).min(1),
    variants: z.record(slug, z.array(z.string()).min(1)),
  }),
  fixtures: z
    .array(
      z.object({
        id: slug,
        name: z.string().trim().min(1),
        variant: slug,
        state: slug,
        props: z.unknown(),
      }),
    )
    .min(1),
});
export interface RegistryResolution {
  entries: readonly RegistryEntry[];
  diagnostics: readonly Diagnostic[];
}
/** Manifest/token failures block resolution; registration failures quarantine only their owner. */
export function resolveRegistry(
  manifest: unknown,
  tokenInput: unknown,
  entries: readonly RegistryEntry[],
  options: { fixtureIsolation?: boolean; repair?: boolean } = {},
): Result<RegistryResolution> {
  const contract = validateManifest(manifest);
  if (!contract.ok) return contract;
  if (contract.value.componentRegistry.availability !== 'configured')
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'REGISTRY_NOT_CONFIGURED',
          '$.componentRegistry',
          'The Component Registry must be configured.',
        ),
      ],
    };
  const repaired = options.repair
    ? updateTokensInScope(manifest, tokenInput, { kind: 'global' }, {})
    : null;
  const tokens = repaired?.ok
    ? { ok: true as const, value: { config: repaired.value.config } }
    : options.repair && repaired
      ? repaired
      : resolveTokens(tokenInput);
  if (!tokens.ok) return tokens;
  const accepted: RegistryEntry[] = [];
  const diagnostics: Diagnostic[] = [];
  const ids = entries.map((entry) => entry?.id);
  for (const [index, entry] of entries.entries()) {
    const path = `$.registry[${JSON.stringify(entry?.id ?? index)}]`;
    const local: Diagnostic[] = [];
    const parsed = entrySchema.safeParse(entry);
    if (!parsed.success) {
      diagnostics.push(
        ...parsed.error.issues.map((issue) =>
          diagnostic(
            'REGISTRY_INVALID',
            `${path}.${issue.path.join('.')}`,
            issue.message,
          ),
        ),
      );
      continue;
    }
    const data = parsed.data;
    const add = (code: string, suffix: string, message: string) =>
      local.push(diagnostic(code, `${path}.${suffix}`, message));
    if (ids.filter((id) => id === data.id).length !== 1)
      add(
        'REGISTRY_ID_DUPLICATE',
        'id',
        'Component IDs must be unique; ambiguous entries are quarantined.',
      );
    for (const [name, values] of [
      ['variants', data.variants],
      ['states', data.states],
      ['fixtures', data.fixtures.map((fixture) => fixture.id)],
    ] as const) {
      if (new Set(values).size !== values.length)
        add('REGISTRY_ID_DUPLICATE', name, `Duplicate ${name} identifier.`);
    }
    for (const variant of data.variants) {
      if (!data.tokens.variants[variant]?.length)
        add(
          'REGISTRY_TOKEN_MISSING',
          `tokens.variants.${variant}`,
          'Each variant needs its token IDs.',
        );
      if (!data.fixtures.some((fixture) => fixture.variant === variant))
        add(
          'REGISTRY_FIXTURE_MISSING',
          'fixtures',
          `No fixture for variant: ${variant}`,
        );
    }
    for (const state of data.states)
      if (!data.fixtures.some((fixture) => fixture.state === state))
        add(
          'REGISTRY_FIXTURE_MISSING',
          'fixtures',
          `No fixture for state: ${state}`,
        );
    const groups = [
      ['family', data.tokens.family],
      ...Object.entries(data.tokens.variants),
    ] as const;
    for (const [variant, tokenIds] of groups) {
      if (variant !== 'family' && !data.variants.includes(variant))
        add(
          'REGISTRY_VARIANT_UNKNOWN',
          `tokens.variants.${variant}`,
          'Undeclared variant.',
        );
      for (const tokenId of tokenIds) {
        const token = tokens.value.config.tokens[tokenId];
        if (!token)
          add('REGISTRY_TOKEN_UNKNOWN', 'tokens', `Unknown token: ${tokenId}`);
        else if (
          token.scope.kind === 'global' ||
          token.scope.family !== data.family ||
          (variant === 'family'
            ? token.scope.kind !== 'family'
            : token.scope.kind !== 'variant' || token.scope.variant !== variant)
        )
          add(
            'REGISTRY_TOKEN_SCOPE',
            'tokens',
            `Wrong family/variant scope: ${tokenId}`,
          );
      }
    }
    const fixtureDiagnostics: Diagnostic[] = [];
    for (const fixture of data.fixtures) {
      if (
        !data.variants.includes(fixture.variant) ||
        !data.states.includes(fixture.state)
      )
        add(
          'REGISTRY_FIXTURE_UNDECLARED',
          `fixtures.${fixture.id}`,
          'Fixture references an undeclared variant or state.',
        );
      try {
        const props = entry.checkProps(fixture.props);
        if (!props.ok)
          fixtureDiagnostics.push(
            ...props.diagnostics.map((item) => ({
              ...item,
              path: `${path}.fixtures[${JSON.stringify(fixture.id)}]${item.path.slice(item.path.indexOf('.props'))}`,
            })),
          );
      } catch (error) {
        fixtureDiagnostics.push(
          diagnostic(
            'REGISTRY_PROPS_ERROR',
            `${path}.fixtures[${JSON.stringify(fixture.id)}].props`,
            String(error),
          ),
        );
      }
    }
    if (options.fixtureIsolation) diagnostics.push(...fixtureDiagnostics);
    else local.push(...fixtureDiagnostics);
    if (local.length) diagnostics.push(...local);
    else accepted.push(entry);
  }
  return { ok: true, value: { entries: accepted, diagnostics } };
}

/** Safe serializable gallery metadata. React, props, schemas and callbacks stay in the adapter. */
export function registryCatalog(resolution: RegistryResolution) {
  return {
    entries: resolution.entries.map(
      ({ id, name, category, family, variants, states, tokens, fixtures }) => ({
        id,
        name,
        category,
        family,
        variants,
        states,
        tokens,
        fixtures: fixtures.map(({ id, name, variant, state }) => ({
          id,
          name,
          variant,
          state,
        })),
      }),
    ),
    diagnostics: resolution.diagnostics,
  };
}
export type RegistryCatalog = ReturnType<typeof registryCatalog>;
export function registryTokenIds(catalog: RegistryCatalog): string[] {
  return [
    ...new Set(
      catalog.entries.flatMap((entry) => [
        ...entry.tokens.family,
        ...Object.values(entry.tokens.variants).flat(),
      ]),
    ),
  ];
}
