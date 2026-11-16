import { loadProject } from '@wdf/core/node';
import { unwrap, updateTokensInScope } from '@wdf/core';
import { PREVIEW_WIDTHS } from '@wdf/core/preview';

export async function resolveLabProject(root: string) {
  const project = unwrap(await loadProject(root));
  const preview = project.manifest.preview;
  if (preview.availability !== 'configured')
    throw new Error(
      'PREVIEW_NOT_CONFIGURED: configure the M3 Preview Interface.',
    );
  const origin = new URL(preview.origin);
  if (
    origin.protocol !== 'http:' ||
    origin.hostname !== '127.0.0.1' ||
    !origin.port ||
    origin.origin !== preview.origin ||
    origin.username ||
    origin.password ||
    origin.origin === 'http://127.0.0.1:5175'
  )
    throw new Error(
      'PREVIEW_ORIGIN_INVALID: expected a dedicated http://127.0.0.1:<port> origin distinct from Lab port 5175.',
    );
  if (
    new Set(preview.widths).size !== preview.widths.length ||
    PREVIEW_WIDTHS.some((w) => !preview.widths.includes(w))
  )
    throw new Error(
      'PREVIEW_WIDTHS_INVALID: declare 320, 390, 768, 1024 and 1440 CSS px.',
    );
  // M1 repair gate: trusted identity metadata is required, existing value errors remain editable.
  const editable = unwrap(
    updateTokensInScope(
      project.manifest,
      project.tokenInput,
      { kind: 'global' },
      {},
    ),
  );
  const entry = project.resources['preview'];
  if (entry?.status !== 'RESOLVED') throw new Error('PREVIEW_ENTRY_UNRESOLVED');
  return {
    manifest: project.manifest,
    config: editable.config,
    previewEntry: entry.path,
    registryEntry:
      project.resources['componentRegistry']?.status === 'RESOLVED'
        ? project.resources['componentRegistry'].path
        : undefined,
    previewOrigin: preview.origin,
    widths: preview.widths,
  };
}
