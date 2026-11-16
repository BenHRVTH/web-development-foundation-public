import { useCallback, useEffect, useRef, useState } from 'react';
import { generateTokenCss, type EditableTokenConfig } from '@wdf/core';
import {
  designEdits,
  isPreviewPeer,
  matchesPreviewIdentity,
  previewEnvelope,
  previewResponseSchema,
  type PreviewConnection,
  type PreviewRequest,
} from '@wdf/core/preview';

export type PreviewStatus =
  'loading' | 'connecting' | 'ready' | 'updating' | 'error' | 'disconnected';
export function usePreview(
  connection: PreviewConnection,
  config: EditableTokenConfig,
  componentTokenIds: readonly string[],
) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(0);
  const [canvasColor, setCanvasColor] = useState('rgb(255, 255, 255)');
  const [attempt, setAttempt] = useState(0);
  const current = useRef(config);
  current.current = config;
  const synchronize = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true;
    let connected = false;
    let lastReply = Date.now();
    let pendingSince = 0;
    let revision = 0;
    let acknowledged = 0;
    const started = Date.now();
    const envelope = previewEnvelope(connection);
    function send(message: PreviewRequest) {
      frame.current?.contentWindow?.postMessage(
        message,
        connection.previewOrigin,
      );
    }
    function sync() {
      if (!connected || !generateTokenCss(current.current).ok) return;
      revision++;
      pendingSince = Date.now();
      setStatus('updating');
      send({
        ...envelope,
        type: 'apply-design',
        revision,
        edits: designEdits(current.current, componentTokenIds),
      });
    }
    synchronize.current = sync;
    function receive(event: MessageEvent) {
      if (
        !isPreviewPeer(
          event,
          frame.current?.contentWindow ?? null,
          connection.previewOrigin,
        )
      )
        return;
      const parsed = previewResponseSchema.safeParse(event.data);
      if (!parsed.success || !matchesPreviewIdentity(parsed.data, connection))
        return;
      const message = parsed.data;
      lastReply = Date.now();
      if (message.type === 'ready') {
        setCanvasColor(message.canvasColor);
        connected = true;
        revision = Math.max(revision, message.revision);
        setError('');
        setStatus('ready');
        sync();
      } else if (message.type === 'applied' && message.revision === revision) {
        setCanvasColor(message.canvasColor);
        acknowledged = revision;
        pendingSince = 0;
        setApplied(revision);
        setError('');
        setStatus('ready');
      } else if (
        message.type === 'error' &&
        (message.revision === revision ||
          message.code === 'PREVIEW_RUNTIME_ERROR')
      ) {
        pendingSince = 0;
        setError(`${message.code}: ${message.message}`);
        setStatus('error');
      } else if (message.type === 'pong' && acknowledged === revision) {
        setStatus((previous) =>
          previous === 'disconnected' ? 'ready' : previous,
        );
      }
    }
    window.addEventListener('message', receive);
    setStatus('connecting');
    send({ ...envelope, type: 'connect' });
    const timer = window.setInterval(() => {
      if (!alive) return;
      if (!connected) {
        send({ ...envelope, type: 'connect' });
        if (Date.now() - started > 8000) {
          setError(
            'Az előnézet nem kapcsolódott. Ellenőrizd a helyi projektet, majd próbálj újracsatlakozni.',
          );
          setStatus('error');
        }
      } else {
        send({ ...envelope, type: 'ping' });
        if (Date.now() - lastReply > 6500) {
          setError(
            'Megszakadt az előnézet kapcsolata. A munkamenet tokenértékei megmaradtak.',
          );
          setStatus('disconnected');
        } else if (pendingSince && Date.now() - pendingSince > 8000) {
          setError(
            'A tokenfrissítés nem kapott visszaigazolást. Csatlakozz újra a frissítés megismétléséhez.',
          );
          setStatus('error');
        }
      }
    }, 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('message', receive);
      synchronize.current = () => {};
    };
  }, [connection, attempt, componentTokenIds]);
  useEffect(() => {
    synchronize.current();
  }, [config]);
  const reconnect = useCallback(() => setAttempt((a) => a + 1), []);
  return {
    frame,
    status,
    error,
    applied,
    canvasColor,
    reconnect,
  };
}
