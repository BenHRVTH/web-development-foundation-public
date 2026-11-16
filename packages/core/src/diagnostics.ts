import type { z } from 'zod';
export interface Diagnostic {
  code: string;
  phase: 'structure' | 'compatibility' | 'resolution' | 'tokens' | 'generation';
  path: string;
  message: string;
  ruleId?: string;
  related?: string[];
}
export type Result<T> =
  { ok: true; value: T } | { ok: false; diagnostics: Diagnostic[] };
export function fromSchema<T>(
  schema: z.ZodType<T>,
  input: unknown,
  path = '$',
): Result<T> {
  const parsed = schema.safeParse(input);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        diagnostics: parsed.error.issues.map((issue) => ({
          code: 'SCHEMA_INVALID',
          phase: 'structure',
          path: `${path}${issue.path.map((p) => `[${JSON.stringify(String(p))}]`).join('')}`,
          message: issue.message,
        })),
      };
}
export class WdfError extends Error {
  readonly diagnostics: Diagnostic[];
  constructor(diagnostics: Diagnostic[]) {
    super(
      diagnostics.map((d) => `${d.code} ${d.path}: ${d.message}`).join('\n'),
    );
    this.name = 'WdfError';
    this.diagnostics = diagnostics;
  }
}
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new WdfError(result.diagnostics);
  return result.value;
}
