import { ROOT_REFERENCE_PX } from '@wdf/foundation';
import { type Result } from '../diagnostics.ts';
import { resolveTokens, type ResolvedToken } from './resolve.ts';

export function cssVariableName(id: string): string {
  return `--wdf-${id.replaceAll('.', '--')}`;
}
export function cssValue(token: ResolvedToken): string {
  if (token.type === 'spacing' || token.type === 'dimension')
    return `${Number(token.value) / ROOT_REFERENCE_PX}rem`;
  if (token.type === 'duration') return `${token.value}ms`;
  return String(token.value);
}
/** Shared M1 CSS emitter: browser and Node use exactly the same strict engine. */
export function generateTokenCss(input: unknown): Result<string> {
  const result = resolveTokens(input);
  if (!result.ok) return result;
  const resolved = result.value;
  for (const id of Object.keys(resolved.base)) {
    if (id.split('.').some((segment) => segment.includes('--')))
      return {
        ok: false,
        diagnostics: [
          {
            code: 'CSS_NAME_COLLISION',
            phase: 'generation',
            path: id,
            message: `Ambiguous CSS name ${cssVariableName(id)}; double hyphens inside ID segments are reserved.`,
          },
        ],
      };
  }
  const declarations = (
    tokens: Record<string, ResolvedToken>,
    indent: string,
  ) =>
    Object.entries(tokens)
      .map(
        ([id, token]) => `${indent}${cssVariableName(id)}: ${cssValue(token)};`,
      )
      .join('\n');
  return {
    ok: true,
    value: `:root {\n${declarations(resolved.base, '  ')}\n}\n${resolved.responsive.map((r) => `\n@media (min-width: ${r.minWidth}px) {\n  :root {\n${declarations(r.tokens, '    ')}\n  }\n}\n`).join('')}`,
  };
}
