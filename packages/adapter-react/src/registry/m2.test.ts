import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { resolveRegistry, defineComponent, type RegistryEntry } from './index';
import { unwrap } from '@wdf/core';
import { loadProject } from '@wdf/core/node';
import { z } from 'zod';
import manifest from '../../../../apps/task-manager/wdf/project.json';
import tokens from '../../../../apps/task-manager/wdf/tokens.json';
import {
  componentRegistry,
  buttonRegistration,
  taskCardRegistration,
} from '../../../../apps/task-manager/wdf/registry';
import {
  Button,
  type ButtonProps,
} from '../../../../apps/task-manager/src/components/Button';
import { TextInput } from '../../../../apps/task-manager/src/components/TextInput';
import { Select } from '../../../../apps/task-manager/src/components/Select';
import { Checkbox } from '../../../../apps/task-manager/src/components/Checkbox';
import { TaskCard } from '../../../../apps/task-manager/src/components/TaskCard';
import { Dialog } from '../../../../apps/task-manager/src/components/Dialog';
import { StatusBadge } from '../../../../apps/task-manager/src/components/StatusBadge';
function resolve(entries: readonly RegistryEntry[] = componentRegistry) {
  return unwrap(resolveRegistry(manifest, tokens, entries));
}
const expected = [
  Button,
  TextInput,
  Select,
  Checkbox,
  TaskCard,
  Dialog,
  StatusBadge,
];
describe('M2 Registry contract', () => {
  test('M2-C01: actual project resources resolve to configured modules', async () => {
    const project = unwrap(
      await loadProject(
        new URL('../../../../apps/task-manager/', import.meta.url).pathname,
      ),
    );
    expect(project.resources['componentRegistry']).toEqual({
      status: 'RESOLVED',
      path: expect.stringMatching(/wdf\/registry.ts$/),
    });
    expect(project.resources['preview']).toEqual({
      status: 'RESOLVED',
      path: expect.stringMatching(/wdf\/preview.ts$/),
    });
    expect(resolve().diagnostics).toEqual([]);
    expect(resolve().entries).toHaveLength(7);
    expect(componentRegistry.map((entry) => entry.component)).toEqual(expected);
    expect(
      componentRegistry
        .filter((entry) => entry.category === 'Composite')
        .map((entry) => entry.id),
    ).toEqual(['task-card', 'dialog']);
  });
  for (const entry of componentRegistry)
    for (const fixture of entry.fixtures) {
      test(`M2-C02: ${entry.id}/${fixture.id} validates and renders its actual implementation`, () => {
        const element = unwrap(entry.renderFixture(fixture.id));
        expect(element.type).toBe(entry.component);
        const markup = renderToStaticMarkup(element);
        expect(markup).not.toContain('undefined');
        expect(entry.checkProps(fixture.props).ok).toBe(true);
      });
    }
  test('M2-C03: invalid fixture is localized; six healthy entries still resolve', () => {
    const invalid = {
      ...buttonRegistration,
      fixtures: [
        {
          id: 'broken',
          name: 'Hibás',
          variant: 'primary',
          state: 'default',
          props: { children: 'Mentés', disabled: 'yes' },
        },
      ],
    };
    const result = resolve([invalid, ...componentRegistry.slice(1)]);
    expect(result.entries).toHaveLength(6);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'REGISTRY_PROPS_INVALID',
          path: '$.registry["button"].fixtures["broken"].props["disabled"]',
        }),
      ]),
    );
  });
  test.each([
    ['missing implementation', { component: undefined }, 'REGISTRY_INVALID'],
    ['unknown category', { category: 'Technical' }, 'REGISTRY_INVALID'],
    ['unstable id', { id: 'Button 1' }, 'REGISTRY_INVALID'],
    [
      'unknown token',
      {
        tokens: {
          family: ['component.button.unknown'],
          variants: buttonRegistration.tokens.variants,
        },
      },
      'REGISTRY_TOKEN_UNKNOWN',
    ],
    [
      'wrong family',
      {
        tokens: {
          family: ['component.select.radius'],
          variants: buttonRegistration.tokens.variants,
        },
      },
      'REGISTRY_TOKEN_SCOPE',
    ],
    [
      'wrong variant',
      {
        tokens: {
          family: buttonRegistration.tokens.family,
          variants: {
            ...buttonRegistration.tokens.variants,
            primary: ['component.button.quiet.background'],
          },
        },
      },
      'REGISTRY_TOKEN_SCOPE',
    ],
    [
      'missing variant',
      { variants: ['primary', 'secondary', 'quiet', 'invented'] },
      'REGISTRY_TOKEN_MISSING',
    ],
    [
      'missing state',
      { states: [...buttonRegistration.states, 'invented'] },
      'REGISTRY_FIXTURE_MISSING',
    ],
    [
      'duplicate fixture',
      {
        fixtures: [
          ...buttonRegistration.fixtures,
          buttonRegistration.fixtures[0]!,
        ],
      },
      'REGISTRY_ID_DUPLICATE',
    ],
    [
      'duplicate variant',
      { variants: [...buttonRegistration.variants, 'primary'] },
      'REGISTRY_ID_DUPLICATE',
    ],
    [
      'undeclared fixture variant',
      {
        fixtures: [{ ...buttonRegistration.fixtures[0]!, variant: 'invented' }],
      },
      'REGISTRY_FIXTURE_UNDECLARED',
    ],
  ])(
    'M2-C04: rejects %s without losing healthy entries',
    (_name, patch, code) => {
      // Malformed runtime/plugin input is deliberately injected at the contract boundary.
      const invalid = { ...buttonRegistration, ...patch } as RegistryEntry;
      const result = resolve([invalid, ...componentRegistry.slice(1)]);
      expect(result.entries).toHaveLength(6);
      expect(
        result.diagnostics.some(
          (item) => item.code === code && item.path.includes('registry'),
        ),
      ).toBe(true);
    },
  );
  test('M2-C05: duplicate component IDs quarantine all ambiguous entries', () => {
    const result = resolve([
      buttonRegistration,
      { ...buttonRegistration },
      ...componentRegistry.slice(1),
    ]);
    expect(result.entries).toHaveLength(6);
    expect(
      result.diagnostics.filter(
        (item) => item.code === 'REGISTRY_ID_DUPLICATE',
      ),
    ).toHaveLength(2);
  });
  test('M2-C06: incompatible manifest, unconfigured registry and invalid tokens block resolution', () => {
    expect(
      resolveRegistry(
        { ...manifest, schemaVersion: '9.0.0' },
        tokens,
        componentRegistry,
      ).ok,
    ).toBe(false);
    expect(
      resolveRegistry(
        {
          ...manifest,
          componentRegistry: {
            availability: 'deferred',
            milestone: 'M2',
            entryPoint: 'wdf/registry.ts',
          },
        },
        tokens,
        componentRegistry,
      ).ok,
    ).toBe(false);
    expect(
      resolveRegistry(
        manifest,
        {
          schemaVersion: '1.0.0',
          tokens: {
            'semantic.bad': {
              type: 'spacing',
              scope: { kind: 'global' },
              value: 19,
            },
          },
        },
        componentRegistry,
      ).ok,
    ).toBe(false);
  });
  test('M2-C09: missing or blank Button labels and wrong event props are rejected', () => {
    expect(buttonRegistration.checkProps({}).ok).toBe(false);
    expect(buttonRegistration.checkProps({ children: '  ' }).ok).toBe(false);
    expect(
      buttonRegistration.checkProps({ children: 'Mentés', onClick: 'save' }).ok,
    ).toBe(false);
  });
  test('M2-C07: unknown fixture is a structured failure', () => {
    expect(taskCardRegistration.renderFixture('missing')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'REGISTRY_FIXTURE_UNKNOWN' }],
    });
  });
  test('M2-C08: throwing props validator is localized', () => {
    const result = resolve([
      {
        ...buttonRegistration,
        checkProps() {
          throw new Error('Broken schema');
        },
      },
      ...componentRegistry.slice(1),
    ]);
    expect(result.entries).toHaveLength(6);
    expect(
      result.diagnostics.some((item) => item.code === 'REGISTRY_PROPS_ERROR'),
    ).toBe(true);
  });
});
// These are compile-time assertions: fixture and schema props follow the actual component.
const typedRegistration = {
  id: 'typed',
  name: 'Typed',
  category: 'Primitive' as const,
  family: 'button',
  component: Button,
  propsSchema: z.custom<ButtonProps>(),
  variants: ['primary'],
  states: ['default'],
  tokens: {
    family: ['component.button.radius'],
    variants: { primary: ['component.button.primary.background'] },
  },
};
defineComponent({
  ...typedRegistration,
  fixtures: [
    {
      id: 'valid',
      name: 'Valid',
      variant: 'primary',
      state: 'default',
      props: { children: 'Mentés' },
    },
  ],
});
defineComponent({
  ...typedRegistration,
  fixtures: [
    {
      id: 'invalid',
      name: 'Invalid',
      variant: 'primary',
      state: 'default',
      props: {
        children: 'Mentés',
        // @ts-expect-error A fixture cannot pass a string for the actual Button boolean prop.
        disabled: 'yes',
      },
    },
  ],
});
