import { generateTokenCss } from '@wdf/core';
import {
  applyGlobalEdits,
  applyDesignEdits,
  isPreviewPeer,
  matchesPreviewIdentity,
  previewEnvelope,
  previewRequestSchema,
  type PreviewConnection,
  type PreviewResponse,
} from '@wdf/core/preview';

export const previewDefinition = { version: '1.0.0' } as const;

/** Installs only in the adapter's dev-only preview server, never in application code. */
export function installPreview(
  connection: PreviewConnection,
  manifest: unknown,
  tokenInput: unknown,
  componentTokenIds: readonly string[] = [],
): () => void {
  if (window.parent === window) return () => {};
  let appliedConfig = tokenInput;
  let revision = 0;
  let connected = false;
  let runtimeFailed = false;
  const style = document.createElement('style');
  style.dataset['wdfPreview'] = 'tokens';
  function send(payload: PreviewResponse) {
    window.parent.postMessage(payload, connection.labOrigin);
  }
  const envelope = previewEnvelope(connection);
  function canvasColor() {
    const root = getComputedStyle(document.documentElement).backgroundColor;
    const body = document.body
      ? getComputedStyle(document.body).backgroundColor
      : 'rgba(0, 0, 0, 0)';
    return root !== 'rgba(0, 0, 0, 0)'
      ? root
      : body !== 'rgba(0, 0, 0, 0)'
        ? body
        : 'rgb(255, 255, 255)';
  }
  function receive(event: MessageEvent) {
    if (!isPreviewPeer(event, window.parent, connection.labOrigin)) return;
    const parsed = previewRequestSchema.safeParse(event.data);
    if (!parsed.success || !matchesPreviewIdentity(parsed.data, connection))
      return;
    const message = parsed.data;
    if (message.type === 'connect') {
      // Module/CSS imports must finish before a snapshot can be acknowledged.
      // Otherwise late Vite styles can override the first applied Draft.
      if (document.readyState !== 'complete') return;
      connected = true;
      if (runtimeFailed) {
        runtimeError();
        return;
      }
      send({
        ...envelope,
        type: 'ready',
        revision,
        canvasColor: canvasColor(),
      });
      return;
    }
    if (!connected) return;
    if (message.type === 'ping') {
      send({ ...envelope, type: 'pong' });
      return;
    }
    if (runtimeFailed) {
      runtimeError();
      return;
    }
    if (message.revision <= revision) {
      send({
        ...envelope,
        type: 'error',
        code: 'PREVIEW_REVISION_STALE',
        message: 'Elavult tokenfrissítés elutasítva.',
        revision: message.revision,
      });
      return;
    }
    const edited =
      message.type === 'apply-design'
        ? applyDesignEdits(
            manifest,
            appliedConfig,
            message.edits,
            componentTokenIds,
          )
        : applyGlobalEdits(manifest, appliedConfig, message.edits);
    const css = edited.ok ? generateTokenCss(edited.value.config) : edited;
    if (!css.ok) {
      send({
        ...envelope,
        type: 'error',
        code: 'PREVIEW_TOKENS_INVALID',
        message: css.diagnostics
          .map((d) => `${d.code} ${d.path}: ${d.message}`)
          .join('\n'),
        revision: message.revision,
      });
      return;
    }
    // Append after existing styles; replace a single generated stylesheet, no React remount.
    if (edited.ok) appliedConfig = edited.value.config;
    style.textContent = css.value;
    document.head.append(style);
    revision = message.revision;
    send({
      ...envelope,
      type: 'applied',
      revision,
      canvasColor: canvasColor(),
    });
  }
  function runtimeError() {
    runtimeFailed = true;
    if (connected)
      send({
        ...envelope,
        type: 'error',
        code: 'PREVIEW_RUNTIME_ERROR',
        message:
          'Az alkalmazás futtatási hibát jelzett. Ellenőrizd a böngésző konzolját; a javítás fejlesztői feladat.',
        revision,
      });
  }
  window.addEventListener('message', receive);
  window.addEventListener('error', runtimeError, true);
  window.addEventListener('unhandledrejection', runtimeError);
  return () => {
    window.removeEventListener('message', receive);
    window.removeEventListener('error', runtimeError, true);
    window.removeEventListener('unhandledrejection', runtimeError);
    style.remove();
  };
}
