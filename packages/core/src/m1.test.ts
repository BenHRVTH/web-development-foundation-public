import { afterEach, describe, expect, test } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { contractJsonSchemas } from './contracts/schemas.ts';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CARD_PADDING_PX,
  FOUNDATION_RULES,
  ROOT_REFERENCE_PX,
  SPACING_PX,
} from '@wdf/foundation';
import {
  validateManifest,
  validateManifestStructure,
} from './contracts/manifest.ts';
import { loadProject } from './contracts/resources.ts';
import { resolveTokens, updateTokensInScope } from './tokens/resolve.ts';
import type { TokenConfig } from './tokens/schema.ts';
import { canonicalJson, generateTokens } from './generation/index.ts';
import { unwrap, type Result } from './diagnostics.ts';
import currentManifest from '../../../apps/task-manager/wdf/project.json';
// Preserve the M1 deferred-resource fixture independently of the configured M2 project.
const manifest = {
  ...currentManifest,
  preview: {
    availability: 'deferred',
    milestone: 'M3',
    entryPoint: 'wdf/preview.ts',
  },
  componentRegistry: {
    availability: 'deferred',
    milestone: 'M2',
    entryPoint: 'wdf/registry.ts',
  },
};

import actualTokens from '../../../apps/task-manager/wdf/tokens.json';
function valid(): TokenConfig {
  return {
    schemaVersion: '1.0.0',
    tokens: {
      'primitive.brand': {
        type: 'color',
        scope: { kind: 'global' },
        value: '#123456',
      },
      'semantic.brand': {
        type: 'color',
        scope: { kind: 'global' },
        value: { ref: 'primitive.brand' },
      },
      'semantic.gap': {
        type: 'spacing',
        scope: { kind: 'global' },
        value: { ref: 'foundation.spacing.24' },
      },
      'component.card.background': {
        type: 'color',
        scope: { kind: 'family', family: 'card' },
        value: { ref: 'semantic.brand' },
      },
      'component.card.padding': {
        type: 'spacing',
        role: 'card-padding',
        scope: { kind: 'family', family: 'card' },
        value: { ref: 'foundation.card.spacious' },
      },
      'component.card.featured.background': {
        type: 'color',
        scope: { kind: 'variant', family: 'card', variant: 'featured' },
        value: { ref: 'component.card.background' },
      },
    },
  };
}
function codes(result: Result<unknown>) {
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.diagnostics.map((d) => d.code);
}
describe('M1 Foundation and Contract', () => {
  test('M1-F01: immutable reference scale, presets, stable unique rule metadata', () => {
    expect(ROOT_REFERENCE_PX).toBe(16);
    expect(SPACING_PX).toEqual([0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80]);
    expect(CARD_PADDING_PX).toEqual({
      compact: 16,
      comfortable: 24,
      spacious: 32,
    });
    expect(Object.isFrozen(SPACING_PX)).toBe(true);
    expect(Object.isFrozen(CARD_PADDING_PX)).toBe(true);
    expect(new Set(FOUNDATION_RULES.map((r) => r.id)).size).toBe(
      FOUNDATION_RULES.length,
    );
    expect(new Set(FOUNDATION_RULES.map((r) => r.category)).size).toBe(3);
    expect(
      FOUNDATION_RULES.every(
        (r) =>
          r.evidence &&
          r.reference &&
          Object.isFrozen(r) &&
          Object.isFrozen(r.methods),
      ),
    ).toBe(true);
    expect(
      FOUNDATION_RULES.find((r) => r.id === 'STD-A11Y-001')?.methods,
    ).not.toContain('static');
  });
  test('M1-C01: valid manifest and structurally valid incompatible version remain distinct', () => {
    expect(validateManifest(manifest).ok).toBe(true);
    const incompatible = { ...manifest, schemaVersion: '2.0.0' };
    expect(validateManifestStructure(incompatible).ok).toBe(true);
    const rejected = validateManifest(incompatible);
    expect(codes(rejected)).toContain('CONTRACT_VERSION_UNSUPPORTED');
    if (!rejected.ok)
      expect(rejected.diagnostics[0]).toMatchObject({
        phase: 'compatibility',
        path: '$.schemaVersion',
      });
  });
  test.each(Object.keys(manifest))(
    'M1-C02: required manifest field %s is enforced',
    (key) => {
      const incomplete: Record<string, unknown> = { ...manifest };
      delete incomplete[key];
      expect(codes(validateManifest(incomplete))).toContain('SCHEMA_INVALID');
    },
  );
  test('M1-C03: wrong adapter, unknown properties, path traversal and duplicate QA hooks fail', () => {
    expect(
      codes(
        validateManifest({
          ...manifest,
          adapter: { id: 'vue', version: '1.0.0' },
        }),
      ),
    ).toContain('ADAPTER_INCOMPATIBLE');
    expect(
      codes(
        validateManifest({
          ...manifest,
          adapter: { id: 'react-vite', version: '1.1.0' },
        }),
      ),
    ).toContain('ADAPTER_INCOMPATIBLE');
    expect(
      codes(validateManifest({ ...manifest, hiddenOverride: true })),
    ).toContain('SCHEMA_INVALID');
    expect(
      codes(
        validateManifest({
          ...manifest,
          designTokens: {
            entryPoint: '../secret.json',
            format: 'wdf-tokens@1',
          },
        }),
      ),
    ).toContain('SCHEMA_INVALID');
    expect(
      codes(
        validateManifest({
          ...manifest,
          qa: { hooks: [manifest.qa.hooks[0], manifest.qa.hooks[0]] },
        }),
      ),
    ).toContain('QA_HOOK_DUPLICATE');
  });
});
describe('M1 token graph', () => {
  test('M1-T01: four layers resolve with correct semantic, family and variant values', () => {
    const resolved = unwrap(resolveTokens(valid()));
    expect(resolved.base['foundation.spacing.24']).toEqual({
      type: 'spacing',
      value: 24,
    });
    expect(resolved.base['semantic.brand']?.value).toBe('#123456');
    expect(resolved.base['component.card.featured.background']?.value).toBe(
      '#123456',
    );
    expect(resolved.base['component.card.padding']?.value).toBe(32);
  });
  test.each([
    'spacing',
    'color',
    'dimension',
    'fontWeight',
    'fontFamily',
    'number',
    'duration',
  ])('M1-T02: malformed %s literal is rejected', (type) => {
    const value =
      type === 'fontFamily'
        ? 'var(--hidden)'
        : type === 'color'
          ? 'red; } body {display:none'
          : 'wrong';
    expect(
      codes(
        resolveTokens({
          schemaVersion: '1.0.0',
          tokens: {
            'primitive.invalid': { type, scope: { kind: 'global' }, value },
          },
        }),
      ),
    ).toContain('SCHEMA_INVALID');
  });
  test('M1-T03: unknown references have precise dependency diagnostics', () => {
    const config = valid();
    config.tokens['semantic.brand']!.value = { ref: 'primitive.missing' };
    const result = resolveTokens(config);
    expect(codes(result)).toContain('TOKEN_REFERENCE_UNKNOWN');
    if (!result.ok)
      expect(result.diagnostics[0]).toMatchObject({
        path: '$.tokens.semantic.brand',
        related: ['primitive.missing'],
      });
  });
  test('M1-T04: circular references include the cycle path', () => {
    const config = valid();
    config.tokens['semantic.brand']!.value = { ref: 'semantic.other' };
    config.tokens['semantic.other'] = {
      type: 'color',
      scope: { kind: 'global' },
      value: { ref: 'semantic.brand' },
    };
    const result = resolveTokens(config);
    expect(codes(result)).toContain('TOKEN_CYCLE');
    if (!result.ok)
      expect(
        result.diagnostics.find((d) => d.code === 'TOKEN_CYCLE')?.related,
      ).toEqual(['semantic.brand', 'semantic.other', 'semantic.brand']);
  });
  test('M1-T05: spacing 19px and Foundation replacement are rejected', () => {
    const config = valid();
    config.tokens['semantic.gap']!.value = 19;
    expect(codes(resolveTokens(config))).toContain('SPACING_OUT_OF_SCALE');
    config.tokens['foundation.spacing.24'] = {
      type: 'spacing',
      scope: { kind: 'global' },
      value: 19,
    };
    expect(codes(resolveTokens(config))).toContain('FOUNDATION_OVERRIDE');
    expect(
      codes(resolveTokens({ ...valid(), foundation: { spacing: [19] } })),
    ).toContain('SCHEMA_INVALID');
  });
  test('M1-T06: reference types and card-padding constraints are enforced', () => {
    const config = valid();
    config.tokens['semantic.brand']!.value = { ref: 'semantic.gap' };
    expect(codes(resolveTokens(config))).toContain('TOKEN_REFERENCE_TYPE');
    config.tokens['component.card.padding']!.value = 8;
    expect(codes(resolveTokens(config))).toContain('CARD_PADDING_INVALID');
  });
  test('M1-T07: layer reversal, family leaks and cross-variant dependencies fail', () => {
    const config = valid();
    config.tokens['primitive.brand']!.value = { ref: 'semantic.brand' };
    expect(codes(resolveTokens(config))).toContain('TOKEN_REFERENCE_SCOPE');
    const family = valid();
    family.tokens['component.card.background']!.value = {
      ref: 'component.card.featured.background',
    };
    expect(codes(resolveTokens(family))).toContain('TOKEN_REFERENCE_SCOPE');
    const sibling = valid();
    sibling.tokens['component.card.other.background'] = {
      type: 'color',
      scope: { kind: 'variant', family: 'card', variant: 'other' },
      value: { ref: 'component.card.featured.background' },
    };
    expect(codes(resolveTokens(sibling))).toContain('TOKEN_REFERENCE_SCOPE');
    const crossFamily = valid();
    crossFamily.tokens['component.button.background'] = {
      type: 'color',
      scope: { kind: 'family', family: 'button' },
      value: { ref: 'component.card.background' },
    };
    expect(codes(resolveTokens(crossFamily))).toContain(
      'TOKEN_REFERENCE_SCOPE',
    );
  });
  test('M1-T08: a variant edit is pure and cannot write global or family tokens', () => {
    const input = valid();
    const before = canonicalJson(input);
    const scope = {
      kind: 'variant',
      family: 'card',
      variant: 'featured',
    } as const;
    const next = unwrap(
      updateTokensInScope(manifest, input, scope, {
        'component.card.featured.background': '#fedcba',
      }),
    );
    expect(canonicalJson(input)).toBe(before);
    const resolved = unwrap(next.validation);
    expect(resolved.base['component.card.featured.background']?.value).toBe(
      '#fedcba',
    );
    expect(resolved.base['primitive.brand']?.value).toBe('#123456');
    expect(resolved.base['semantic.brand']?.value).toBe('#123456');
    expect(resolved.base['component.card.background']?.value).toBe('#123456');
    expect(
      codes(
        updateTokensInScope(manifest, input, scope, {
          'primitive.brand': '#abcdef',
        }),
      ),
    ).toContain('EDIT_SCOPE_FORBIDDEN');
    expect(
      codes(
        updateTokensInScope(manifest, input, scope, {
          'component.card.background': '#abcdef',
        }),
      ),
    ).toContain('EDIT_SCOPE_FORBIDDEN');
  });
  test('M1-T09: undeclared responsive data, wrong namespace and incorrect scope fail', () => {
    const config = valid();
    config.tokens['semantic.gap'] = {
      ...config.tokens['semantic.gap']!,
      responsive: { mobile: 16 },
    } as never;
    expect(codes(resolveTokens(config))).toContain('SCHEMA_INVALID');
    const namespace = valid();
    namespace.tokens['global.bad'] = {
      type: 'spacing',
      scope: { kind: 'global' },
      value: 16,
    };
    expect(codes(resolveTokens(namespace))).toContain('TOKEN_NAMESPACE');
    const scope = valid();
    scope.tokens['component.card.background']!.scope = { kind: 'global' };
    expect(codes(resolveTokens(scope))).toContain('TOKEN_SCOPE');
  });
  test('M1-T10: explicit responsive changes cascade through the graph without implicit shrinking', () => {
    const config = valid();
    config.responsive = {
      wide: { minWidth: 1024, overrides: { 'primitive.brand': '#abcdef' } },
      tablet: {
        minWidth: 768,
        overrides: {
          'component.card.padding': { ref: 'foundation.card.comfortable' },
        },
      },
    };
    const r = unwrap(resolveTokens(config));
    expect(r.base['component.card.padding']?.value).toBe(32);
    expect(r.responsive.map((v) => v.minWidth)).toEqual([768, 1024]);
    expect(r.responsive[1]?.tokens['component.card.padding']?.value).toBe(24);
    expect(
      r.responsive[1]?.tokens['component.card.featured.background']?.value,
    ).toBe('#abcdef');
  });
  test('M1-T11: responsive unknown targets, Foundation override, type, scale, ambiguity and cycles fail', () => {
    for (const [overrides, code] of [
      [{ 'semantic.missing': 16 }, 'RESPONSIVE_TARGET_UNKNOWN'],
      [{ 'foundation.spacing.24': 16 }, 'FOUNDATION_OVERRIDE'],
      [{ 'semantic.brand': 16 }, 'TOKEN_VALUE_TYPE'],
      [{ 'semantic.gap': 19 }, 'SPACING_OUT_OF_SCALE'],
      [{ 'semantic.brand': { ref: 'semantic.brand' } }, 'TOKEN_CYCLE'],
    ] as const)
      expect(
        codes(
          resolveTokens({
            ...valid(),
            responsive: { tablet: { minWidth: 768, overrides } },
          }),
        ),
      ).toContain(code);
    expect(
      codes(
        resolveTokens({
          ...valid(),
          responsive: {
            a: { minWidth: 768, overrides: { 'semantic.gap': 16 } },
            b: { minWidth: 768, overrides: { 'semantic.gap': 24 } },
          },
        }),
      ),
    ).toContain('RESPONSIVE_AMBIGUOUS');
  });
  test('M1-T12: declared or recorded exceptions never bypass locked checks or MUST rules', () => {
    const config = valid();
    config.exceptions = [
      {
        id: 'request-1',
        ruleId: 'WDF-SPACING-001',
        tokenIds: ['semantic.gap'],
        reason: 'Documented design requirement',
        requestedBy: 'designer',
        evidence: ['design/decision'],
        approval: {
          approvedBy: 'reviewer',
          approvedAt: '2026-11-14T12:00:00Z',
          decisionId: 'external-1',
        },
      },
    ];
    expect(resolveTokens(config).ok).toBe(true);
    config.tokens['semantic.gap']!.value = 19;
    expect(codes(resolveTokens(config))).toContain('SPACING_OUT_OF_SCALE');
    config.exceptions[0]!.ruleId = 'STD-A11Y-001';
    expect(codes(resolveTokens(config))).toContain('EXCEPTION_RULE_FORBIDDEN');
  });
});
describe('M1 deterministic generation', () => {
  test('M1-G01: stable CSS/TS, correct rem, source digest and input order independence', () => {
    const input = valid();
    const before = canonicalJson(input);
    const a = unwrap(generateTokens(input));
    const b = unwrap(
      generateTokens({
        tokens: Object.fromEntries(Object.entries(input.tokens).reverse()),
        schemaVersion: input.schemaVersion,
      }),
    );
    expect(a).toEqual(b);
    expect(a).toEqual(unwrap(generateTokens(input)));
    expect(canonicalJson(input)).toBe(before);
    for (const px of SPACING_PX)
      expect(a.css).toContain(
        `--wdf-foundation--spacing--${px}: ${px / 16}rem;`,
      );
    expect(a.typescript).toContain(
      'export type TokenId = keyof typeof tokenValues;',
    );
    expect(a.css).toContain(a.sourceDigest);
    expect(a.typescript).toContain(a.sourceDigest);
  });
  test('M1-G02: changing the canonical source changes both artifacts and digest', () => {
    const input = valid();
    const a = unwrap(generateTokens(input));
    input.tokens['primitive.brand']!.value = '#987654';
    const b = unwrap(generateTokens(input));
    expect(a.css).not.toBe(b.css);
    expect(a.typescript).not.toBe(b.typescript);
    expect(a.sourceDigest).not.toBe(b.sourceDigest);
    expect(b.css).toContain(
      '--wdf-component--card--featured--background: #987654;',
    );
  });
  test('M1-G03: ambiguous names and invalid input cannot produce artifacts', () => {
    const input = valid();
    input.tokens['primitive.color--brand'] = {
      type: 'color',
      scope: { kind: 'global' },
      value: '#123',
    };
    expect(codes(generateTokens(input))).toContain('CSS_NAME_COLLISION');
    expect(generateTokens({}).ok).toBe(false);
  });
  test('M1-G04: responsive CSS and TypeScript contain resolved, cascaded values', () => {
    const input = valid();
    input.responsive = {
      tablet: { minWidth: 768, overrides: { 'primitive.brand': '#abcdef' } },
    };
    const generated = unwrap(generateTokens(input));
    expect(generated.css).toContain('@media (min-width: 768px)');
    expect(generated.css).toContain(
      '--wdf-component--card--featured--background: #abcdef;',
    );
    expect(generated.typescript).toContain('"minWidth": 768');
  });
  test('M1-G05: unrestricted project colors and typography are accepted within typed format', () => {
    const input = valid();
    input.tokens['primitive.brand']!.value = '#ff00f188';
    input.tokens['primitive.font'] = {
      type: 'fontFamily',
      scope: { kind: 'global' },
      value: '"My Brand", Georgia, serif',
    };
    input.tokens['primitive.size'] = {
      type: 'dimension',
      scope: { kind: 'global' },
      value: 37,
    };
    input.tokens['primitive.weight'] = {
      type: 'fontWeight',
      scope: { kind: 'global' },
      value: 637,
    };
    expect(generateTokens(input).ok).toBe(true);
  });
});
const tempRoots: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function projectRoot() {
  const root = await mkdtemp(join(tmpdir(), 'wdf-m1-'));
  tempRoots.push(root);
  await mkdir(join(root, 'wdf'));
  await writeFile(join(root, 'wdf/project.json'), JSON.stringify(manifest));
  await writeFile(join(root, 'wdf/tokens.json'), JSON.stringify(valid()));
  return root;
}
describe('M1 resource integration', () => {
  test('M1-R01: project loads with honest deferred capabilities', async () => {
    const root = await projectRoot();
    const project = unwrap(await loadProject(root));
    expect(project.resources['designTokens']?.status).toBe('RESOLVED');
    expect(project.resources['componentRegistry']).toEqual({
      status: 'NOT_RUN',
      milestone: 'M2',
    });
    expect(project.resources['preview']).toEqual({
      status: 'NOT_RUN',
      milestone: 'M3',
    });
    expect(resolveTokens(project.tokenInput).ok).toBe(true);
  });
  test('M1-R02: missing resource and configured Registry cannot masquerade as working', async () => {
    const root = await projectRoot();
    await rm(join(root, 'wdf/tokens.json'));
    expect(codes(await loadProject(root))).toContain('RESOURCE_UNRESOLVED');
    await writeFile(join(root, 'wdf/tokens.json'), '{}');
    await writeFile(
      join(root, 'wdf/project.json'),
      JSON.stringify({
        ...manifest,
        componentRegistry: {
          availability: 'configured',
          entryPoint: 'wdf/registry.ts',
        },
      }),
    );
    expect(codes(await loadProject(root))).toContain('RESOURCE_UNRESOLVED');
  });
  test('M1-R03: invalid JSON, incompatible versions and escaping symlinks fail precisely', async () => {
    const root = await projectRoot();
    await writeFile(join(root, 'wdf/tokens.json'), '{');
    expect(codes(await loadProject(root))).toContain('RESOURCE_JSON_INVALID');
    await writeFile(
      join(root, 'wdf/project.json'),
      JSON.stringify({ ...manifest, schemaVersion: '9.0.0' }),
    );
    expect(codes(await loadProject(root))).toContain(
      'CONTRACT_VERSION_UNSUPPORTED',
    );
    await writeFile(join(root, 'wdf/project.json'), JSON.stringify(manifest));
    await rm(join(root, 'wdf/tokens.json'));
    await symlink('/etc/passwd', join(root, 'wdf/tokens.json'));
    expect(codes(await loadProject(root))).toContain('RESOURCE_UNRESOLVED');
  });
  test('M1-R04: actual application loads and uses the single declared token source', async () => {
    const root = new URL('../../../apps/task-manager/', import.meta.url)
      .pathname;
    const project = unwrap(await loadProject(root));
    expect(project.tokenInput).toEqual(actualTokens);
    const css = await readFile(join(root, 'src/app.css'), 'utf8');
    const generated = unwrap(generateTokens(project.tokenInput));
    expect(css).toMatch(/@import ['"]\.\/generated\/tokens\.css['"]/);
    for (const name of css.matchAll(/var\((--wdf-[a-z0-9-]+)\)/g))
      expect(generated.css).toContain(`${name[1]}:`);
    expect(css).not.toMatch(/#[\da-fA-F]{3,8}\b/);
  });
});

test('M1-G06: CLI drift gate fails on tampering without repairing output or changing the source', async () => {
  const root = await projectRoot();
  const cli = fileURLToPath(
    new URL('../../../tools/generate-m1.ts', import.meta.url),
  );
  const run = promisify(execFile);
  const before = await readFile(join(root, 'wdf/tokens.json'), 'utf8');
  await run(process.execPath, [cli, '--project', root]);
  await run(process.execPath, [cli, '--project', root, '--check']);
  await writeFile(join(root, 'src/generated/tokens.css'), '/* tampered */');
  await expect(
    run(process.execPath, [cli, '--project', root, '--check']),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining('GENERATED_OUTPUT_STALE'),
  });
  expect(await readFile(join(root, 'src/generated/tokens.css'), 'utf8')).toBe(
    '/* tampered */',
  );
  expect(await readFile(join(root, 'wdf/tokens.json'), 'utf8')).toBe(before);
});
test('M1-C04: exported JSON Schemas correspond to the runtime structural schemas', () => {
  const schemas = contractJsonSchemas();
  expect(schemas.manifest.required).toContain('schemaVersion');
  expect(schemas.tokens.required).toContain('tokens');
  expect(schemas.editableTokens.required).toContain('tokens');
  expect(schemas.manifest.additionalProperties).toBe(false);
});
test('M1-T13: international font names are accepted; malformed family lists are rejected', () => {
  const config = valid();
  config.tokens['primitive.font'] = {
    type: 'fontFamily',
    scope: { kind: 'global' },
    value: '"Árvíztűrő betű", system-ui, sans-serif',
  };
  expect(generateTokens(config).ok).toBe(true);
  for (const value of [
    '"unterminated',
    'serif,',
    'var(--font)',
    'serif; color:red',
  ]) {
    config.tokens['primitive.font'].value = value;
    expect(resolveTokens(config).ok).toBe(false);
  }
});

describe('M1 repair editing regression', () => {
  const global = { kind: 'global' } as const;
  const family = { kind: 'family', family: 'card' } as const;
  const variant = {
    kind: 'variant',
    family: 'card',
    variant: 'featured',
  } as const;

  test('M1-E01: an off-scale spacing can be repaired from 19px to 24px', () => {
    const input = valid();
    input.tokens['semantic.gap']!.value = 19;
    const before = canonicalJson(input);
    expect(resolveTokens(input).ok).toBe(false);
    const repaired = unwrap(
      updateTokensInScope(manifest, input, global, { 'semantic.gap': 24 }),
    );
    expect(repaired.config.tokens['semantic.gap']?.value).toBe(24);
    expect(repaired.validation.ok).toBe(true);
    expect(generateTokens(repaired.config).ok).toBe(true);
    expect(canonicalJson(input)).toBe(before);
  });
  test('M1-E02: independent spacing, reference and card errors can be repaired one at a time', () => {
    const input = valid();
    input.tokens['semantic.gap']!.value = 19;
    input.tokens['semantic.brand']!.value = { ref: 'primitive.missing' };
    input.tokens['component.card.padding']!.value = 8;
    const before = canonicalJson(input);
    const spacing = unwrap(
      updateTokensInScope(manifest, input, global, { 'semantic.gap': 24 }),
    );
    expect(spacing.config.tokens['semantic.gap']?.value).toBe(24);
    expect(codes(spacing.validation)).toContain('TOKEN_REFERENCE_UNKNOWN');
    const reference = unwrap(
      updateTokensInScope(manifest, spacing.config, global, {
        'semantic.brand': { ref: 'primitive.brand' },
      }),
    );
    expect(codes(reference.validation)).toContain('CARD_PADDING_INVALID');
    for (const partial of [spacing, reference]) {
      expect(resolveTokens(partial.config).ok).toBe(false);
      const generated = generateTokens(partial.config);
      expect(generated.ok).toBe(false);
      expect(generated).not.toHaveProperty('value');
    }
    const repaired = unwrap(
      updateTokensInScope(manifest, reference.config, family, {
        'component.card.padding': 32,
      }),
    );
    expect(repaired.validation.ok).toBe(true);
    expect(generateTokens(repaired.config).ok).toBe(true);
    expect(canonicalJson(input)).toBe(before);
    expect(spacing.config.tokens['component.card.padding']?.value).toBe(8);
  });
  test('M1-E03: wrong literal types can be repaired without blocking other fixes', () => {
    const input = valid();
    const malformed = {
      ...input,
      tokens: {
        ...input.tokens,
        'primitive.brand': { ...input.tokens['primitive.brand'], value: false },
      },
    };
    const first = unwrap(
      updateTokensInScope(manifest, malformed, global, { 'semantic.gap': 16 }),
    );
    expect(codes(first.validation)).toContain('SCHEMA_INVALID');
    // @ts-expect-error An editable candidate must not imply a validated token type.
    const validated: TokenConfig = first.config;
    void validated;
    expect(generateTokens(first.config).ok).toBe(false);
    const second = unwrap(
      updateTokensInScope(manifest, first.config, global, {
        'primitive.brand': '#abcdef',
      }),
    );
    expect(second.validation.ok).toBe(true);
    expect(
      unwrap(second.validation).base['component.card.featured.background']
        ?.value,
    ).toBe('#abcdef');
  });
  test('M1-E04: a cycle can be repaired while an unrelated off-scale value remains', () => {
    const input = valid();
    input.tokens['semantic.gap']!.value = 19;
    input.tokens['semantic.brand']!.value = { ref: 'semantic.other' };
    input.tokens['semantic.other'] = {
      type: 'color',
      scope: global,
      value: { ref: 'semantic.brand' },
    };
    expect(codes(resolveTokens(input))).toContain('TOKEN_CYCLE');
    const first = unwrap(
      updateTokensInScope(manifest, input, global, {
        'semantic.brand': { ref: 'primitive.brand' },
      }),
    );
    expect(codes(first.validation)).toContain('SPACING_OUT_OF_SCALE');
    expect(codes(first.validation)).not.toContain('TOKEN_CYCLE');
    expect(generateTokens(first.config).ok).toBe(false);
    const second = unwrap(
      updateTokensInScope(manifest, first.config, global, {
        'semantic.gap': 24,
      }),
    );
    expect(second.validation.ok).toBe(true);
  });
  test('M1-E05: existing type and reference-scope violations can be corrected', () => {
    for (const ref of ['semantic.gap', 'component.card.background']) {
      const input = valid();
      input.tokens['semantic.brand']!.value = { ref };
      expect(resolveTokens(input).ok).toBe(false);
      const repaired = unwrap(
        updateTokensInScope(manifest, input, global, {
          'semantic.brand': { ref: 'primitive.brand' },
        }),
      );
      expect(repaired.validation.ok).toBe(true);
    }
  });
  test.each([
    ['missing', undefined, 'SCHEMA_INVALID'],
    ['empty', {}, 'SCHEMA_INVALID'],
    [
      'missing field',
      { ...manifest, designTokens: undefined },
      'SCHEMA_INVALID',
    ],
    [
      'incompatible',
      { ...manifest, schemaVersion: '2.0.0' },
      'CONTRACT_VERSION_UNSUPPORTED',
    ],
    [
      'wrong adapter',
      { ...manifest, adapter: { id: 'vue', version: '1.0.0' } },
      'ADAPTER_INCOMPATIBLE',
    ],
    [
      'wrong adapter version',
      { ...manifest, adapter: { id: 'react-vite', version: '2.0.0' } },
      'ADAPTER_INCOMPATIBLE',
    ],
  ])(
    'M1-E06: %s Manifest blocks editing before token diagnostics',
    (_, contract, code) => {
      const input = valid();
      input.tokens['semantic.gap']!.value = 19;
      const before = canonicalJson(input);
      const result = updateTokensInScope(contract, input, global, {
        'semantic.gap': 24,
      });
      expect(codes(result)).toContain(code);
      expect(result).not.toHaveProperty('value');
      expect(canonicalJson(input)).toBe(before);
    },
  );
  test.each([
    [variant, 'primitive.brand'],
    [variant, 'semantic.brand'],
    [variant, 'component.card.background'],
    [variant, 'component.card.other.background'],
    [variant, 'component.button.background'],
    [family, 'primitive.brand'],
    [family, 'component.card.featured.background'],
    [global, 'component.card.background'],
    [global, 'component.card.featured.background'],
  ])('M1-E07: scope %o cannot change %s even during repair', (scope, id) => {
    const input = valid();
    input.tokens['semantic.gap']!.value = 19;
    input.tokens['component.card.other.background'] = {
      type: 'color',
      scope: { kind: 'variant', family: 'card', variant: 'other' },
      value: '#123456',
    };
    input.tokens['component.button.background'] = {
      type: 'color',
      scope: { kind: 'family', family: 'button' },
      value: '#123456',
    };
    const before = canonicalJson(input);
    expect(
      codes(updateTokensInScope(manifest, input, scope, { [id]: '#abcdef' })),
    ).toContain('EDIT_SCOPE_FORBIDDEN');
    expect(canonicalJson(input)).toBe(before);
  });
  test('M1-E08: forged ownership metadata cannot make a component token globally editable', () => {
    const input = valid();
    input.tokens['component.card.background']!.scope = global;
    expect(
      codes(
        updateTokensInScope(manifest, input, global, {
          'component.card.background': '#abcdef',
        }),
      ),
    ).toContain('TOKEN_SCOPE');
  });
  test('M1-E09: an invalid unrelated value does not bypass new reference ownership or type checks', () => {
    const input = valid();
    input.tokens['semantic.gap']!.value = 19;
    input.tokens['component.card.other.background'] = {
      type: 'color',
      scope: { kind: 'variant', family: 'card', variant: 'other' },
      value: '#123456',
    };
    for (const [scope, id, ref, code] of [
      [global, 'primitive.brand', 'semantic.brand', 'TOKEN_REFERENCE_SCOPE'],
      [
        global,
        'semantic.brand',
        'component.card.background',
        'TOKEN_REFERENCE_SCOPE',
      ],
      [
        family,
        'component.card.background',
        'component.card.featured.background',
        'TOKEN_REFERENCE_SCOPE',
      ],
      [
        variant,
        'component.card.featured.background',
        'component.card.other.background',
        'TOKEN_REFERENCE_SCOPE',
      ],
      [global, 'semantic.brand', 'semantic.gap', 'TOKEN_REFERENCE_TYPE'],
      [
        global,
        'semantic.brand',
        'primitive.unknown',
        'TOKEN_REFERENCE_UNKNOWN',
      ],
    ] as const)
      expect(
        codes(updateTokensInScope(manifest, input, scope, { [id]: { ref } })),
      ).toContain(code);
  });
  test('M1-E10: invalid patches fail atomically and cannot alter token metadata or Foundation', () => {
    const input = valid();
    input.tokens['semantic.gap']!.value = 19;
    const before = canonicalJson(input);
    for (const [changes, code] of [
      [
        { 'semantic.brand': '#fedcba', 'semantic.gap': 19 },
        'SPACING_OUT_OF_SCALE',
      ],
      [{ 'semantic.brand': 42 }, 'SCHEMA_INVALID'],
      [
        { 'semantic.brand': { ref: 'primitive.brand', scope: global } },
        'SCHEMA_INVALID',
      ],
      [{ 'semantic.unknown': 24 }, 'EDIT_SCOPE_FORBIDDEN'],
      [{ 'foundation.spacing.24': 32 }, 'EDIT_SCOPE_FORBIDDEN'],
    ] as const) {
      const result = updateTokensInScope(
        manifest,
        input,
        global,
        changes as never,
      );
      expect(codes(result)).toContain(code);
      expect(result).not.toHaveProperty('value');
      expect(canonicalJson(input)).toBe(before);
    }
    const result = updateTokensInScope(manifest, input, family, {
      'component.card.padding': 8,
    });
    expect(codes(result)).toContain('CARD_PADDING_INVALID');
  });
  test('M1-E11: base and existing responsive errors can be repaired independently', () => {
    const input = valid();
    input.tokens['semantic.gap']!.value = 19;
    const malformed = {
      ...input,
      responsive: {
        tablet: {
          minWidth: 768,
          overrides: { 'semantic.gap': 19, 'primitive.brand': false },
        },
      },
    };
    const before = canonicalJson(malformed);
    const base = unwrap(
      updateTokensInScope(manifest, malformed, global, { 'semantic.gap': 24 }),
    );
    expect(base.validation.ok).toBe(false);
    const responsiveColor = unwrap(
      updateTokensInScope(
        manifest,
        base.config,
        global,
        { 'primitive.brand': '#abcdef' },
        { responsive: 'tablet' },
      ),
    );
    expect(codes(responsiveColor.validation)).toContain('SPACING_OUT_OF_SCALE');
    expect(generateTokens(responsiveColor.config).ok).toBe(false);
    const responsiveGap = unwrap(
      updateTokensInScope(
        manifest,
        responsiveColor.config,
        global,
        { 'semantic.gap': 32 },
        { responsive: 'tablet' },
      ),
    );
    const resolved = unwrap(responsiveGap.validation);
    expect(resolved.base['semantic.gap']?.value).toBe(24);
    expect(resolved.responsive[0]?.tokens['semantic.gap']?.value).toBe(32);
    expect(
      resolved.responsive[0]?.tokens['component.card.featured.background']
        ?.value,
    ).toBe('#abcdef');
    expect(generateTokens(responsiveGap.config).ok).toBe(true);
    expect(responsiveGap.config.responsive?.['tablet']?.minWidth).toBe(768);
    expect(canonicalJson(malformed)).toBe(before);
  });
  test('M1-E12: responsive edits cannot create implicit overrides or escape the exact scope', () => {
    const input = valid();
    input.responsive = {
      tablet: { minWidth: 768, overrides: { 'semantic.gap': 19 } },
    };
    expect(
      codes(
        updateTokensInScope(
          manifest,
          input,
          global,
          { 'semantic.gap': 24 },
          { responsive: 'mobile' },
        ),
      ),
    ).toContain('EDIT_RESPONSIVE_UNDECLARED');
    expect(
      codes(
        updateTokensInScope(
          manifest,
          input,
          global,
          { 'primitive.brand': '#abcdef' },
          { responsive: 'tablet' },
        ),
      ),
    ).toContain('EDIT_SCOPE_FORBIDDEN');
    expect(
      codes(
        updateTokensInScope(
          manifest,
          input,
          variant,
          { 'semantic.gap': 24 },
          { responsive: 'tablet' },
        ),
      ),
    ).toContain('EDIT_SCOPE_FORBIDDEN');
    expect(
      codes(
        updateTokensInScope(
          manifest,
          input,
          global,
          { 'foundation.spacing.24': 32 },
          { responsive: 'tablet' },
        ),
      ),
    ).toContain('EDIT_SCOPE_FORBIDDEN');
  });
  test('M1-E13: malformed identity, scope, patch and version structures block editing', () => {
    const input = valid();
    for (const malformed of [
      { ...input, schemaVersion: '2.0.0' },
      { ...input, tokens: { 'semantic.gap': { scope: global, value: 19 } } },
      {
        ...input,
        tokens: { 'semantic.gap': { type: 'spacing', scope: global } },
      },
      {
        ...input,
        tokens: {
          'semantic.gap': { type: 'mystery', scope: global, value: 19 },
        },
      },
      {
        ...input,
        tokens: {
          'semantic.gap': {
            type: 'spacing',
            scope: { kind: 'instance' },
            value: 19,
          },
        },
      },
      { ...input, hidden: true },
      {
        ...input,
        responsive: { mobile: { overrides: { 'semantic.gap': 19 } } },
      },
    ])
      expect(
        codes(
          updateTokensInScope(manifest, malformed, global, {
            'semantic.gap': 24,
          }),
        ),
      ).toContain('SCHEMA_INVALID');
    expect(
      codes(
        updateTokensInScope(manifest, input, { kind: 'instance' } as never, {
          'semantic.gap': 24,
        }),
      ),
    ).toContain('SCHEMA_INVALID');
    expect(
      codes(updateTokensInScope(manifest, input, global, null as never)),
    ).toContain('SCHEMA_INVALID');
    expect(
      codes(
        updateTokensInScope(manifest, input, global, { 'semantic.gap': 24 }, {
          target: 'mobile',
        } as never),
      ),
    ).toContain('SCHEMA_INVALID');
    const forged = {
      ...input,
      tokens: {
        ...input.tokens,
        'foundation.spacing.24': { type: 'spacing', scope: global, value: 19 },
      },
    };
    expect(
      codes(
        updateTokensInScope(manifest, forged, global, { 'semantic.gap': 24 }),
      ),
    ).toContain('FOUNDATION_OVERRIDE');
  });
  test('M1-E14: returned candidates never alias the source or patch objects', () => {
    const input = valid();
    input.tokens['semantic.gap']!.value = 19;
    const reference = { ref: 'primitive.brand' };
    const edited = unwrap(
      updateTokensInScope(manifest, input, global, {
        'semantic.brand': reference,
      }),
    );
    reference.ref = 'primitive.missing';
    expect(edited.config.tokens['semantic.brand']?.value).toEqual({
      ref: 'primitive.brand',
    });
    edited.config.tokens['primitive.brand']!.value = '#ffffff';
    expect(input.tokens['primitive.brand']!.value).toBe('#123456');
  });
});
