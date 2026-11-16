import { z } from 'zod';
import { manifestSchema } from './manifest.ts';
import {
  editableTokenConfigSchema,
  tokenConfigSchema,
} from '../tokens/schema.ts';
/** Structural JSON Schemas only; graph, compatibility and resource checks are separate. */
export function contractJsonSchemas() {
  return {
    manifest: z.toJSONSchema(manifestSchema),
    tokens: z.toJSONSchema(tokenConfigSchema),
    editableTokens: z.toJSONSchema(editableTokenConfigSchema),
  };
}
