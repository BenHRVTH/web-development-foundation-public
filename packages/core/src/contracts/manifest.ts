import { z } from 'zod';
import { fromSchema, type Diagnostic, type Result } from '../diagnostics.ts';
export const CONTRACT_VERSION = '1.0.0';
const id = z.string().regex(/^[a-z][a-z0-9-]*$/);
const entryPoint = z
  .string()
  .regex(
    /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+$/,
    'Expected a project-relative path without parent traversal.',
  );
const registry = z.discriminatedUnion('availability', [
  z.strictObject({
    availability: z.literal('deferred'),
    milestone: z.literal('M2'),
    entryPoint,
  }),
  z.strictObject({ availability: z.literal('configured'), entryPoint }),
]);
const preview = z.discriminatedUnion('availability', [
  z.strictObject({
    availability: z.literal('deferred'),
    milestone: z.literal('M3'),
    entryPoint,
  }),
  z.strictObject({
    availability: z.literal('configured'),
    entryPoint,
    origin: z.url(),
    widths: z.array(z.number().int().positive()).min(1),
  }),
]);
export const manifestSchema = z.strictObject({
  schemaVersion: z.string(),
  project: z.strictObject({ id, name: z.string().trim().min(1) }),
  adapter: z.strictObject({ id, version: z.string().regex(/^\d+\.\d+\.\d+$/) }),
  designTokens: z.strictObject({
    entryPoint,
    format: z.literal('wdf-tokens@1'),
  }),
  componentRegistry: registry,
  preview,
  qa: z.strictObject({
    hooks: z
      .array(
        z.strictObject({
          id,
          kind: z.enum(['static', 'browser']),
          command: z.array(z.string().min(1)).min(1),
        }),
      )
      .min(1),
  }),
});
export type ProjectManifest = z.infer<typeof manifestSchema>;
export type RegistryContract = ProjectManifest['componentRegistry'];
export type PreviewContract = ProjectManifest['preview'];
/** Structural validation does not read files, load modules or run hooks. */
export function validateManifestStructure(
  input: unknown,
): Result<ProjectManifest> {
  return fromSchema(manifestSchema, input);
}
/** v1 compatibility is exact, fail-closed. This is the adapter contract protocol version. */
export function validateManifest(input: unknown): Result<ProjectManifest> {
  const structure = validateManifestStructure(input);
  if (!structure.ok) return structure;
  const m = structure.value;
  const diagnostics: Diagnostic[] = [];
  if (m.schemaVersion !== CONTRACT_VERSION)
    diagnostics.push({
      code: 'CONTRACT_VERSION_UNSUPPORTED',
      phase: 'compatibility',
      path: '$.schemaVersion',
      message: `Supported contract: ${CONTRACT_VERSION}; received: ${m.schemaVersion}.`,
    });
  if (m.adapter.id !== 'react-vite' || m.adapter.version !== '1.0.0')
    diagnostics.push({
      code: 'ADAPTER_INCOMPATIBLE',
      phase: 'compatibility',
      path: '$.adapter',
      message: 'M1 supports react-vite adapter contract 1.0.0.',
    });
  const hookIds = m.qa.hooks.map((h) => h.id);
  if (new Set(hookIds).size !== hookIds.length)
    diagnostics.push({
      code: 'QA_HOOK_DUPLICATE',
      phase: 'structure',
      path: '$.qa.hooks',
      message: 'QA hook IDs must be unique.',
    });
  return diagnostics.length ? { ok: false, diagnostics } : structure;
}
