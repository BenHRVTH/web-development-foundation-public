import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  validateTypographyProfile,
  weightAvailability,
  tokenDependsOn,
  type TypographyReport,
} from './typography.ts';
import type { EditableTokenConfig } from './tokens/schema.ts';
const config: EditableTokenConfig = JSON.parse(
  await readFile('apps/task-manager/wdf/tokens.json', 'utf8'),
);
const input = JSON.parse(
  await readFile('apps/task-manager/wdf/typography.json', 'utf8'),
);
describe('ADR-0011: project-owned typography constraints and evidence', () => {
  test('Every existing named weight remains a candidate; real failures cannot be deleted from the profile', () => {
    const p = validateTypographyProfile(input, config);
    expect(p.roles).toHaveLength(9);
    expect(p.roles.every((r) => r.weights.join(',') === '400,600,700')).toBe(
      true,
    );
  });
  test.each([
    undefined,
    { ...input, schemaVersion: '2.0.0' },
    { ...input, roles: [] },
    { ...input, roles: [input.roles[0], input.roles[0]] },
  ])('Missing, unknown and duplicated profiles are rejected', (bad) =>
    expect(() => validateTypographyProfile(bad, config)).toThrow(),
  );
  test('Unknown/wrong token types, duplicate weights and missing font contexts are rejected', () => {
    for (const change of [
      { familyToken: 'primitive.weight.regular' },
      { weights: [400, 400] },
      { weightToken: 'primitive.weight.unknown' },
    ]) {
      const bad = structuredClone(input);
      Object.assign(bad.roles[0], change);
      expect(() => validateTypographyProfile(bad, config)).toThrow();
    }
    expect(() =>
      validateTypographyProfile({ ...input, roles: [input.roles[0]] }, config),
    ).toThrow('UNMAPPED');
  });
  test('A project may declare a single fixed weight without inventing a second fontface', () => {
    const fixed = structuredClone(input);
    for (const role of fixed.roles) role.weights = [400];
    expect(
      validateTypographyProfile(fixed, config).roles.every(
        (r) => r.weights.length === 1,
      ),
    ).toBe(true);
  });
  test('Without rendered evidence there are no verified options', () => {
    expect(
      weightAvailability(
        validateTypographyProfile(input, config),
        null,
        config,
        'primitive.weight.medium',
      ).verified,
    ).toEqual([]);
  });
  test('Shared-token choices are the intersection across all consumers, not the most permissive font', () => {
    const p = validateTypographyProfile(input, config);
    const report: TypographyReport = {
      schemaVersion: '1.0.0',
      session: 'test',
      status: 'FAIL',
      errors: [],
      roles: p.roles.map((r) => ({
        id: r.id,
        weightToken: r.weightToken,
        verifiedWeights: r.id === 'utility' ? [400, 700] : [400, 600, 700],
        rejectedWeights: r.id === 'utility' ? [600] : [],
        currentValues: [],
        errors: [],
        measurements: [],
      })),
    };
    expect(
      weightAvailability(p, report, config, 'primitive.weight.medium').verified,
    ).toEqual([400, 700]);
    expect(
      weightAvailability(p, report, config, 'primitive.weight.medium')
        .candidates,
    ).toEqual([400, 600, 700]);
    expect(config.tokens['primitive.weight.medium']!.value).toBe(600);
  });
  test('Reference and responsive dependencies cannot bypass a shared token constraint', () => {
    const c = structuredClone(config);
    c.tokens['semantic.weight.test'] = {
      type: 'fontWeight',
      scope: { kind: 'global' },
      value: { ref: 'primitive.weight.medium' },
    };
    expect(
      tokenDependsOn(c, 'semantic.weight.test', 'primitive.weight.medium'),
    ).toBe(true);
    c.tokens['semantic.weight.test']!.value = { ref: 'semantic.weight.test' };
    expect(
      tokenDependsOn(c, 'semantic.weight.test', 'primitive.weight.medium'),
    ).toBe(false);
  });
});
