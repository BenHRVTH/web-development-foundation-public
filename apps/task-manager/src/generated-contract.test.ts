import { expect, test } from 'vitest';
import {
  cssVariables,
  tokenValues,
  type TokenId,
  type CssVariable,
} from './generated/tokens';
const paddingId: TokenId = 'component.task-card.comfortable.padding';
const paddingVariable: CssVariable = cssVariables[paddingId];
// @ts-expect-error Generated union must reject undeclared token IDs.
const invalidId: TokenId = 'semantic.missing';
void invalidId;
test('M1-I01: generated TypeScript definitions expose the actual project contract', () => {
  expect(tokenValues[paddingId]).toBe('1.5rem');
  expect(paddingVariable).toBe(
    '--wdf-component--task-card--comfortable--padding',
  );
});
