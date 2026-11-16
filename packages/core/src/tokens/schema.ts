import { z } from 'zod';
export const tokenIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+$/);
const ref = z.strictObject({ ref: tokenIdSchema });
const color = z
  .string()
  .regex(
    /^#(?:[\da-fA-F]{3}|[\da-fA-F]{4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/,
    'Expected a CSS hex color (3, 4, 6 or 8 digits).',
  );
const family = z
  .string()
  .regex(
    /^(?:[\p{L}_][\p{L}\p{N}_ -]*|"[\p{L}\p{N}_ -]+"|'[\p{L}\p{N}_ -]+')(?:,\s*(?:[\p{L}_][\p{L}\p{N}_ -]*|"[\p{L}\p{N}_ -]+"|'[\p{L}\p{N}_ -]+'))*$/u,
    'Expected a literal comma-separated font-family list without functions or CSS declarations.',
  );
export const literalSchemas = {
  spacing: z.number().finite().nonnegative(),
  dimension: z.number().finite().nonnegative(),
  color,
  fontFamily: family,
  fontWeight: z.number().int().min(1).max(1000),
  number: z.number().finite(),
  duration: z.number().finite().nonnegative(),
};
export const tokenScopeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('global') }),
  z.strictObject({
    kind: z.literal('family'),
    family: z.string().regex(/^[a-z][a-z0-9-]*$/),
  }),
  z.strictObject({
    kind: z.literal('variant'),
    family: z.string().regex(/^[a-z][a-z0-9-]*$/),
    variant: z.string().regex(/^[a-z][a-z0-9-]*$/),
  }),
]);
const common = {
  scope: tokenScopeSchema,
  role: z.enum(['card-padding']).optional(),
};
export const tokenSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...common,
    type: z.literal('spacing'),
    value: z.union([literalSchemas.spacing, ref]),
  }),
  z.strictObject({
    ...common,
    type: z.literal('dimension'),
    value: z.union([literalSchemas.dimension, ref]),
  }),
  z.strictObject({
    ...common,
    type: z.literal('color'),
    value: z.union([color, ref]),
  }),
  z.strictObject({
    ...common,
    type: z.literal('fontFamily'),
    value: z.union([family, ref]),
  }),
  z.strictObject({
    ...common,
    type: z.literal('fontWeight'),
    value: z.union([literalSchemas.fontWeight, ref]),
  }),
  z.strictObject({
    ...common,
    type: z.literal('number'),
    value: z.union([literalSchemas.number, ref]),
  }),
  z.strictObject({
    ...common,
    type: z.literal('duration'),
    value: z.union([literalSchemas.duration, ref]),
  }),
]);
const exceptionSchema = z.strictObject({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  tokenIds: z.array(tokenIdSchema).min(1),
  reason: z.string().trim().min(1),
  requestedBy: z.string().trim().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  approval: z
    .strictObject({
      approvedBy: z.string().trim().min(1),
      approvedAt: z.iso.datetime(),
      decisionId: z.string().min(1),
    })
    .optional(),
});
export const tokenConfigSchema = z.strictObject({
  schemaVersion: z.literal('1.0.0'),
  tokens: z.record(tokenIdSchema, tokenSchema),
  responsive: z
    .record(
      z.string().regex(/^[a-z][a-z0-9-]*$/),
      z.strictObject({
        minWidth: z.number().int().positive(),
        overrides: z
          .record(
            tokenIdSchema,
            z.union([z.number().finite(), z.string(), ref]),
          )
          .refine(
            (v) => Object.keys(v).length > 0,
            'An explicit override must have a target.',
          ),
      }),
    )
    .optional(),
  exceptions: z.array(exceptionSchema).optional(),
});
export type Token = z.infer<typeof tokenSchema>;
export type TokenConfig = z.infer<typeof tokenConfigSchema>;
export type TokenType = Token['type'];
export type TokenValue = Token['value'];

/** Editing trusts identity metadata, but leaves existing JSON values unvalidated. */
export const editableTokenConfigSchema = tokenConfigSchema.extend({
  tokens: z.record(
    tokenIdSchema,
    z.strictObject({
      ...common,
      type: z.object(literalSchemas).keyof(),
      value: z.json(),
    }),
  ),
  responsive: z
    .record(
      tokenConfigSchema.shape.responsive.unwrap().keyType,
      tokenConfigSchema.shape.responsive.unwrap().valueType.extend({
        overrides: z
          .record(tokenIdSchema, z.json())
          .refine(
            (value) => Object.keys(value).length > 0,
            'An explicit override must have a target.',
          ),
      }),
    )
    .optional(),
});
export type EditableTokenConfig = z.infer<typeof editableTokenConfigSchema>;
