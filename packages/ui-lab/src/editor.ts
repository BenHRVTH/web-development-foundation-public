import {
  foundationTokens,
  mayReference,
  type EditableTokenConfig,
} from '@wdf/core';
export const categories = [
  'Colors',
  'Typography',
  'Spacing',
  'Shapes',
  'Layout',
] as const;
export type Category = (typeof categories)[number];
/** Presentation grouping only; every editable ID, type, value and scope comes from Contract. */
export function categoryOf(
  id: string,
  token: EditableTokenConfig['tokens'][string],
): Category {
  if (token.type === 'color') return 'Colors';
  if (
    token.type === 'fontFamily' ||
    token.type === 'fontWeight' ||
    /\.(size|leading|weight|font)\./.test(id)
  )
    return 'Typography';
  if (token.type === 'spacing') return 'Spacing';
  if (/radius|border|focus-width/.test(id)) return 'Shapes';
  return 'Layout';
}
export function tokenLabel(id: string) {
  return id.split('.').slice(1).join(' · ').replaceAll('-', ' ');
}
export function referenceOptions(
  config: EditableTokenConfig,
  type: string,
  ownId: string,
): string[] {
  return [
    ...Object.entries(foundationTokens())
      .filter(([, t]) => t.type === type)
      .map(([id]) => id),
    ...Object.entries(config.tokens)
      .filter(
        ([id, t]) =>
          id !== ownId &&
          t.type === type &&
          !!config.tokens[ownId] &&
          mayReference(ownId, config.tokens[ownId]!, id, t),
      )
      .map(([id]) => id),
  ];
}
