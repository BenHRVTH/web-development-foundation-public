import { describe, expect, test } from 'vitest';
import manifest from '../../../../apps/task-manager/wdf/project.json';
import tokens from '../../../../apps/task-manager/wdf/tokens.json';
import { generateTokens } from '../generation/index.ts';
import { generateTokenCss } from '../tokens/css.ts';
import { resolveTokens } from '../tokens/resolve.ts';
import { unwrap } from '../diagnostics.ts';
import {
  applyGlobalEdits,
  globalEdits,
  isPreviewPeer,
  matchesPreviewIdentity,
  previewEnvelope,
  previewRequestSchema,
  previewResponseSchema,
} from './index.ts';

const identity = { projectId: 'task-manager', session: 'a'.repeat(64) };
const envelope = previewEnvelope(identity);
describe('M3 protocol and live global session', () => {
  test('M3-P01: versioned strict requests/responses reject code, CSS, unknown commands and envelope fields', () => {
    expect(
      previewRequestSchema.safeParse({ ...envelope, type: 'connect' }).success,
    ).toBe(true);
    expect(
      previewResponseSchema.safeParse({
        ...envelope,
        type: 'ready',
        revision: 0,
        canvasColor: 'rgb(255, 255, 255)',
      }).success,
    ).toBe(true);
    for (const message of [
      { ...envelope, version: '2.0.0', type: 'connect' },
      { ...envelope, type: 'execute', code: 'globalThis.compromised = true' },
      { ...envelope, type: 'apply', revision: 1, css: 'body {}' },
      { ...envelope, type: 'apply', revision: 1, edits: [], command: 'write' },
      { ...envelope, type: 'apply', revision: 0, edits: [] },
      {
        ...envelope,
        type: 'apply',
        revision: 1,
        edits: [
          {
            id: 'primitive.color.ink',
            value: '#ffffff',
            scope: { kind: 'global' },
          },
        ],
      },
      { ...envelope, session: '', type: 'connect' },
      null,
    ])
      expect(previewRequestSchema.safeParse(message).success).toBe(false);
  });
  test('M3-P02: sender origin AND exact source AND session AND project are required', () => {
    const expected = {} as MessageEventSource;
    expect(
      isPreviewPeer(
        { source: expected, origin: 'http://127.0.0.1:5175' },
        expected,
        'http://127.0.0.1:5175',
      ),
    ).toBe(true);
    expect(
      isPreviewPeer(
        { source: expected, origin: 'https://attacker.test' },
        expected,
        'http://127.0.0.1:5175',
      ),
    ).toBe(false);
    expect(
      isPreviewPeer(
        { source: {} as MessageEventSource, origin: 'http://127.0.0.1:5175' },
        expected,
        'http://127.0.0.1:5175',
      ),
    ).toBe(false);
    expect(
      isPreviewPeer(
        { source: null, origin: 'http://127.0.0.1:5175' },
        null,
        'http://127.0.0.1:5175',
      ),
    ).toBe(false);
    expect(matchesPreviewIdentity(identity, identity)).toBe(true);
    expect(
      matchesPreviewIdentity(
        { ...identity, session: 'b'.repeat(64) },
        identity,
      ),
    ).toBe(false);
    expect(
      matchesPreviewIdentity({ ...identity, projectId: 'other' }, identity),
    ).toBe(false);
  });
  test('M3-T01: same M1 emitter, unchanged full snapshot and transitive semantic/component dependencies', () => {
    const before = structuredClone(tokens);
    const css = unwrap(generateTokenCss(tokens));
    expect(unwrap(generateTokens(tokens)).css.endsWith(css)).toBe(true);
    const snapshot = globalEdits(
      unwrap(applyGlobalEdits(manifest, tokens, [])).config,
    );
    expect(
      unwrap(
        generateTokenCss(
          unwrap(applyGlobalEdits(manifest, tokens, snapshot)).config,
        ),
      ),
    ).toBe(css);
    const edited = unwrap(
      applyGlobalEdits(manifest, tokens, [
        { id: 'primitive.color.accent', value: '#123456' },
      ]),
    );
    const resolved = unwrap(edited.validation);
    expect(resolved.base['semantic.color.accent']?.value).toBe('#123456');
    expect(resolved.base['component.button.primary.background']?.value).toBe(
      '#123456',
    );
    expect(tokens).toEqual(before);
  });
  test('M3-T02: Foundation, component scope, type, reference and undeclared responsive edits fail atomically', () => {
    for (const edit of [
      { id: 'foundation.spacing.16', value: 24 },
      { id: 'component.button.radius', value: 20 },
      { id: 'semantic.space.page', value: 19 },
      { id: 'primitive.color.accent', value: 'red;display:none' },
      { id: 'primitive.font.body', value: 'url(https://example.test)' },
      { id: 'semantic.color.accent', value: { ref: 'missing.color' } },
      { id: 'semantic.space.page', value: 24, responsive: 'phone' },
      { id: 'primitive.color.accent', value: '#123456', responsive: 'tablet' },
    ]) {
      const source = structuredClone(tokens);
      expect(
        applyGlobalEdits(manifest, source, [
          { id: 'primitive.color.accent', value: '#654321' },
          edit,
        ]).ok,
      ).toBe(false);
      expect(source).toEqual(tokens);
    }
  });
  test('M3-T03: existing bad values are incrementally repairable; invalid graph never emits CSS', () => {
    const source = structuredClone(tokens);
    source.tokens['primitive.color.ink'].value = 'invalid';
    // Use JSON input intentionally; repair permits malformed existing value types.
    const invalid = {
      ...source,
      tokens: {
        ...source.tokens,
        'semantic.space.page': {
          ...source.tokens['semantic.space.page'],
          value: 19,
        },
      },
    };
    const first = unwrap(
      applyGlobalEdits(manifest, invalid, [
        { id: 'semantic.space.page', value: 24 },
      ]),
    );
    expect(first.validation.ok).toBe(false);
    expect(generateTokenCss(first.config).ok).toBe(false);
    expect(generateTokens(first.config).ok).toBe(false);
    const second = unwrap(
      applyGlobalEdits(manifest, first.config, [
        { id: 'primitive.color.ink', value: '#252237' },
      ]),
    );
    expect(second.validation.ok).toBe(true);
    expect(generateTokenCss(second.config).ok).toBe(true);
  });
  test('M3-T04: explicit responsive edit affects only its declaration and dependent resolution', () => {
    const result = unwrap(
      applyGlobalEdits(manifest, tokens, [
        { id: 'semantic.space.page', value: 80, responsive: 'tablet' },
      ]),
    );
    const resolved = unwrap(result.validation);
    expect(resolved.base['semantic.space.page']?.value).toBe(24);
    expect(resolved.responsive[0]?.tokens['semantic.space.page']?.value).toBe(
      80,
    );
    expect(resolved.responsive[1]?.tokens['semantic.space.page']?.value).toBe(
      64,
    );
    expect(resolveTokens(tokens).ok).toBe(true);
  });
  test('M3-T05: bad Contract, forged metadata, duplicate patch slots and CSS name ambiguity remain blocked', () => {
    expect(
      applyGlobalEdits({ ...manifest, schemaVersion: '9.0.0' }, tokens, []).ok,
    ).toBe(false);
    expect(
      applyGlobalEdits(manifest, tokens, [
        { id: 'primitive.color.ink', value: '#111111' },
        { id: 'primitive.color.ink', value: '#222222' },
      ]).ok,
    ).toBe(false);
    expect(
      generateTokenCss({
        ...tokens,
        tokens: {
          ...tokens.tokens,
          'primitive.bad--name': {
            type: 'color',
            scope: { kind: 'global' },
            value: '#ffffff',
          },
        },
      }).ok,
    ).toBe(false);
    expect(
      applyGlobalEdits(
        manifest,
        {
          ...tokens,
          tokens: {
            ...tokens.tokens,
            'component.button.radius': {
              type: 'dimension',
              scope: { kind: 'global' },
              value: 8,
            },
          },
        },
        [],
      ).ok,
    ).toBe(false);
  });
});
