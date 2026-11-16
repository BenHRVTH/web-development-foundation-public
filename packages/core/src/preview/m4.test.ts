import { expect, test } from 'vitest';
import {
  unwrap,
  generateTokenCss,
  resolveTokens,
  updateTokensInScope,
} from '@wdf/core';
import manifest from '../../../../apps/task-manager/wdf/project.json';
import tokens from '../../../../apps/task-manager/wdf/tokens.json';
import {
  componentRegistry,
  buttonRegistration,
} from '../../../../apps/task-manager/wdf/registry';
import {
  resolveRegistry,
  registryCatalog,
  registryTokenIds,
  type RegistryEntry,
} from '@wdf/adapter-react';
import {
  applyDesignEdits,
  designEdits,
  previewEnvelope,
  previewRequestSchema,
} from './index';
const catalog = registryCatalog(
  unwrap(resolveRegistry(manifest, tokens, componentRegistry)),
);
const allowed = registryTokenIds(catalog);
const config = unwrap(
  updateTokensInScope(manifest, tokens, { kind: 'global' }, {}),
).config;
test('M4-T07: Registry catalog exposes seven original implementations and 27 metadata-only fixtures', () => {
  expect(catalog.entries).toHaveLength(7);
  expect(catalog.entries.flatMap((e) => e.fixtures)).toHaveLength(27);
  expect(JSON.stringify(catalog)).not.toContain('props');
  expect(
    designEdits(config, allowed).filter((e) => e.scope.kind !== 'global'),
  ).toHaveLength(allowed.length);
  const roundtrip = unwrap(
    applyDesignEdits(manifest, tokens, designEdits(config, allowed), allowed),
  );
  expect(unwrap(generateTokenCss(roundtrip.config))).toBe(
    unwrap(generateTokenCss(tokens)),
  );
});
test('M4-C05: family and variant scope remain isolated; family references inherit transitively', () => {
  const family = unwrap(
    applyDesignEdits(
      manifest,
      tokens,
      [
        {
          id: 'component.button.radius',
          scope: { kind: 'family', family: 'button' },
          value: 20,
        },
      ],
      allowed,
    ),
  );
  const changed = unwrap(
    applyDesignEdits(
      manifest,
      family.config,
      [
        {
          id: 'component.button.primary.background',
          scope: { kind: 'variant', family: 'button', variant: 'primary' },
          value: '#123456',
        },
      ],
      allowed,
    ),
  );
  const resolved = unwrap(resolveTokens(changed.config));
  expect(resolved.base['component.button.radius']?.value).toBe(20);
  expect(resolved.base['component.button.primary.background']?.value).toBe(
    '#123456',
  );
  for (const [id, t] of Object.entries(tokens.tokens))
    if (
      ![
        'component.button.radius',
        'component.button.primary.background',
      ].includes(id)
    )
      expect(changed.config.tokens[id]).toEqual(t);
  const inherited = unwrap(
    applyDesignEdits(
      manifest,
      changed.config,
      [
        {
          id: 'component.button.primary.background',
          scope: { kind: 'variant', family: 'button', variant: 'primary' },
          value: { ref: 'semantic.color.accent' },
        },
      ],
      allowed,
    ),
  );
  expect(
    unwrap(inherited.validation).base['component.button.primary.background']
      ?.value,
  ).toBe('#5b3cb4');
});
test('M4-C05/P01: forged scope, unregistered token, Foundation, missing reference, invalid spacing, duplicate and mixed batch reject atomically', () => {
  const valid = {
    id: 'component.button.radius',
    scope: { kind: 'family' as const, family: 'button' },
    value: 20,
  };
  for (const edit of [
    {
      ...valid,
      scope: { kind: 'variant' as const, family: 'button', variant: 'primary' },
    },
    { ...valid, scope: { kind: 'family' as const, family: 'select' } },
    { ...valid, scope: { kind: 'global' as const } },
    { ...valid, id: 'foundation.spacing.16' },
    { ...valid, value: { ref: 'semantic.unknown' } },
    {
      ...valid,
      id: 'component.task-card.compact.padding',
      scope: {
        kind: 'variant' as const,
        family: 'task-card',
        variant: 'compact',
      },
      value: 19,
    },
    { ...valid, value: { ref: 'component.select.radius' } },
    { ...valid },
  ]) {
    const source = structuredClone(tokens);
    expect(applyDesignEdits(manifest, source, [valid, edit], allowed).ok).toBe(
      false,
    );
    expect(source).toEqual(tokens);
  }
  expect(applyDesignEdits(manifest, tokens, [valid], []).ok).toBe(false);
  const envelope = previewEnvelope({
    projectId: 'task-manager',
    session: 'a'.repeat(64),
  });
  for (const message of [
    {
      ...envelope,
      type: 'apply-design',
      revision: 1,
      edits: [{ ...valid, scope: { kind: 'instance', id: 'x' } }],
    },
    {
      ...envelope,
      type: 'apply-design',
      revision: 1,
      edits: [{ ...valid, css: 'body{}' }],
    },
    {
      ...envelope,
      type: 'apply-design',
      revision: 1,
      edits: [valid],
      javascript: 'alert(1)',
    },
    {
      ...envelope,
      type: 'apply-design',
      revision: 1,
      edits: [{ ...valid, scope: { ...valid.scope, variant: 'primary' } }],
    },
    { ...envelope, version: '1.0.0', type: 'connect' },
  ])
    expect(previewRequestSchema.safeParse(message).success).toBe(false);
});
test('M4-C04: Studio fixture isolation keeps healthy fixtures; default M2 quarantine contract remains', () => {
  const bad = {
    ...buttonRegistration,
    fixtures: buttonRegistration.fixtures.map((f, i) =>
      i === 0 ? { ...f, props: { ...f.props, disabled: 'yes' } } : f,
    ),
  } as RegistryEntry;
  const entries = [bad, ...componentRegistry.slice(1)];
  const studio = unwrap(
    resolveRegistry(manifest, tokens, entries, {
      fixtureIsolation: true,
      repair: true,
    }),
  );
  expect(studio.entries).toHaveLength(7);
  expect(studio.diagnostics[0]?.path).toBe(
    '$.registry["button"].fixtures["primary"].props["disabled"]',
  );
  expect(
    unwrap(resolveRegistry(manifest, tokens, entries)).entries,
  ).toHaveLength(6);
  const duplicate = unwrap(
    resolveRegistry(manifest, tokens, [...entries, bad], {
      fixtureIsolation: true,
    }),
  );
  expect(duplicate.entries).toHaveLength(6);
  expect(
    duplicate.diagnostics.some((d) => d.code === 'REGISTRY_ID_DUPLICATE'),
  ).toBe(true);
});
test('M4-repair: malformed component/global values remain incrementally repairable; no partial CSS', () => {
  const source = {
    ...tokens,
    tokens: {
      ...tokens.tokens,
      'component.button.radius': {
        ...tokens.tokens['component.button.radius'],
        value: -1,
      },
      'primitive.color.accent': {
        ...tokens.tokens['primitive.color.accent'],
        value: 'bad',
      },
    },
  };
  expect(
    unwrap(
      resolveRegistry(manifest, source, componentRegistry, {
        fixtureIsolation: true,
        repair: true,
      }),
    ).entries,
  ).toHaveLength(7);
  const first = unwrap(
    applyDesignEdits(
      manifest,
      source,
      [
        {
          id: 'component.button.radius',
          scope: { kind: 'family', family: 'button' },
          value: 16,
        },
      ],
      allowed,
    ),
  );
  expect(first.validation.ok).toBe(false);
  expect(generateTokenCss(first.config).ok).toBe(false);
  const last = unwrap(
    applyDesignEdits(
      manifest,
      first.config,
      [
        {
          id: 'primitive.color.accent',
          scope: { kind: 'global' },
          value: '#123456',
        },
      ],
      allowed,
    ),
  );
  expect(last.validation.ok).toBe(true);
});

test('M4-C04b: a throwing validator retains an exact fixture path for localized Studio rejection', () => {
  const entry: RegistryEntry = {
    ...buttonRegistration,
    checkProps(input) {
      if (
        typeof input === 'object' &&
        input !== null &&
        'children' in input &&
        input.children === 'Új feladat'
      )
        throw new Error('isolated validator failure');
      return buttonRegistration.checkProps(input);
    },
  };
  const result = unwrap(
    resolveRegistry(manifest, tokens, [entry, ...componentRegistry.slice(1)], {
      fixtureIsolation: true,
      repair: true,
    }),
  );
  expect(result.entries).toHaveLength(7);
  expect(result.diagnostics).toEqual([
    expect.objectContaining({
      code: 'REGISTRY_PROPS_ERROR',
      path: '$.registry["button"].fixtures["primary"].props',
    }),
  ]);
});
