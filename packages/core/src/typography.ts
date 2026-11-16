import { z } from 'zod';
import { resolveTokens } from './tokens/resolve.ts';
import { tokenIdSchema, type EditableTokenConfig } from './tokens/schema.ts';

const targetSchema = z.discriminatedUnion('workspace', [
  z.strictObject({
    workspace: z.literal('website'),
    selector: z.string().min(1),
  }),
  z.strictObject({
    workspace: z.literal('studio'),
    component: z.string().min(1),
    fixture: z.string().min(1),
    selector: z.string().min(1),
  }),
]);
export const typographyProfileSchema = z.strictObject({
  schemaVersion: z.literal('1.0.0'),
  roles: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-z][a-z0-9-]*$/),
        familyToken: tokenIdSchema,
        sizeToken: tokenIdSchema,
        weightToken: tokenIdSchema,
        weights: z.array(z.number().int().min(1).max(1000)).min(1).max(16),
        targets: z.array(targetSchema).min(1).max(32),
      }),
    )
    .min(1)
    .max(128),
});
export type TypographyProfile = z.infer<typeof typographyProfileSchema>;
export function tokenDependsOn(
  config: EditableTokenConfig,
  from: string,
  target: string,
  seen = new Set<string>(),
): boolean {
  if (from === target) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  const values = [
    config.tokens[from]?.value,
    ...Object.values(config.responsive ?? {}).map((r) => r.overrides[from]),
  ];
  return values.some(
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      'ref' in v &&
      typeof v.ref === 'string' &&
      tokenDependsOn(config, v.ref, target, seen),
  );
}
export function validateTypographyProfile(
  input: unknown,
  config: EditableTokenConfig,
): TypographyProfile {
  const profile = typographyProfileSchema.parse(input);
  if (new Set(profile.roles.map((r) => r.id)).size !== profile.roles.length)
    throw new Error('TYPOGRAPHY_DUPLICATE_ROLE');
  for (const role of profile.roles) {
    for (const [id, type] of [
      [role.familyToken, 'fontFamily'],
      [role.sizeToken, 'dimension'],
      [role.weightToken, 'fontWeight'],
    ])
      if (config.tokens[id!]?.type !== type)
        throw new Error('TYPOGRAPHY_TOKEN_TYPE: ' + id);
    if (new Set(role.weights).size !== role.weights.length)
      throw new Error('TYPOGRAPHY_DUPLICATE_WEIGHT: ' + role.id);
    if (!role.targets.some((t) => t.workspace === 'website'))
      throw new Error('TYPOGRAPHY_WEBSITE_TARGET_REQUIRED: ' + role.id);
  }
  for (const [id, token] of Object.entries(config.tokens))
    if (
      token.type === 'fontWeight' &&
      !profile.roles.some((r) => tokenDependsOn(config, r.weightToken, id))
    )
      throw new Error('TYPOGRAPHY_WEIGHT_UNMAPPED: ' + id);
  return profile;
}
const numbers = z.array(z.number().int().min(1).max(1000));
export const typographyReportSchema = z.strictObject({
  schemaVersion: z.literal('1.0.0'),
  session: z.string(),
  status: z.enum(['PASS', 'FAIL', 'ERROR']),
  roles: z.array(
    z.strictObject({
      id: z.string(),
      weightToken: z.string(),
      verifiedWeights: numbers,
      rejectedWeights: numbers,
      currentValues: numbers,
      errors: z.array(z.string()),
      measurements: z.array(z.record(z.string(), z.json())),
    }),
  ),
  errors: z.array(z.string()),
});
export type TypographyReport = z.infer<typeof typographyReportSchema>;
export function weightAvailability(
  profile: TypographyProfile | null,
  report: TypographyReport | null,
  config: EditableTokenConfig,
  id: string,
) {
  const roles =
    profile?.roles.filter((r) => tokenDependsOn(config, r.weightToken, id)) ??
    [];
  const candidates = [...new Set(roles.flatMap((r) => r.weights))].sort(
    (a, b) => a - b,
  );
  const verified = candidates.filter(
    (w) =>
      roles.length > 0 &&
      roles.every((r) => {
        const proof = report?.roles.find(
          (p) => p.id === r.id && p.weightToken === r.weightToken,
        );
        return r.weights.includes(w) && proof?.verifiedWeights.includes(w);
      }),
  );
  return { candidates, verified, resolved: resolveTokens(config).ok };
}
