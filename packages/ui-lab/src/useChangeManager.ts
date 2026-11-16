import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeOperation, ChangeView } from '@wdf/core/change';
import project from 'virtual:wdf-project';

export function useChangeManager() {
  const [view, setView] = useState<ChangeView | null>(null);
  const current = useRef<ChangeView | null>(null);
  const [error, setError] = useState('');
  const failure = useRef('');
  const readFailure = useRef(false);
  const refreshing = useRef(false);
  const [pending, setPending] = useState(0);
  const [fieldEpoch, setFieldEpoch] = useState(0);
  const count = useRef(0);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const alive = useRef(true);
  const headers = { 'X-WDF-Session': project.connection.session };
  function commit(value: ChangeView) {
    if (
      alive.current &&
      (!current.current ||
        value.state.revision >= current.current.state.revision)
    ) {
      // Polls carry status/freshness, not a new design edit. Keep ACK lifecycles stable.
      if (current.current) {
        if (
          value.context.configurationDigest ===
          current.current.context.configurationDigest
        )
          value.state.draft = current.current.state.draft;
        if (
          value.state.initial.context.configurationDigest ===
          current.current.state.initial.context.configurationDigest
        )
          value.state.initial = current.current.state.initial;
        if (
          value.state.baseline &&
          value.state.baseline.approval.id ===
            current.current.state.baseline?.approval.id
        )
          value.state.baseline = current.current.state.baseline;
      }
      current.current = value;
      setView(value);
    }
  }
  const refresh = useCallback(async (clearError = false) => {
    if (count.current || refreshing.current) return;
    refreshing.current = true;
    try {
      const response = await fetch('/__wdf/state', {
        headers: { 'X-WDF-Session': project.connection.session },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      commit(await response.json());
      if (clearError || readFailure.current) {
        failure.current = '';
        readFailure.current = false;
        setError('');
        // A background read recovery must not reset an in-progress field gesture.
        if (clearError) setFieldEpoch((epoch) => epoch + 1);
      }
    } catch (error) {
      // Read-only polling may recover after a fresh successful response. Never
      // replace a sticky uncertain-write failure with an auto-recoverable read.
      if (alive.current && (!failure.current || readFailure.current)) {
        failure.current = String(error);
        readFailure.current = true;
        setError(`A mentési szolgáltatás nem érhető el. ${String(error)}`);
      }
    } finally {
      refreshing.current = false;
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void refresh();
    const timer = window.setInterval(() => {
      if (!failure.current || readFailure.current) void refresh();
    }, 1500);
    return () => {
      alive.current = false;
      window.clearInterval(timer);
    };
  }, [refresh]);
  const perform = useCallback(
    (operation: ChangeOperation): Promise<boolean> => {
      count.current++;
      setPending(count.current);
      const task = chain.current
        .then(async () => {
          if (failure.current) return false;
          const value = current.current;
          if (!value) return false;
          try {
            const response = await fetch('/__wdf/change', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(15000),
              body: JSON.stringify({
                version: '1.0.0',
                projectId: project.connection.projectId,
                session: project.connection.session,
                requestId: crypto.randomUUID(),
                expectedRevision: value.state.revision,
                operation,
              }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            commit(data as ChangeView);
            return true;
          } catch (error) {
            readFailure.current = false;
            failure.current = String(error);
            if (alive.current)
              setError(
                `A művelet nem igazolt. A mentett állapotot ellenőrizd a visszatöltéssel. ${String(error)}`,
              );
            return false;
          }
        })
        .finally(() => {
          count.current--;
          if (alive.current) setPending(count.current);
        });
      chain.current = task;
      return task;
    },
    [],
  );
  useEffect(() => {
    function leave(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    if (pending || error) window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [pending, error]);
  return { view, error, pending, perform, refresh, fieldEpoch };
}
export type ChangeClient = ReturnType<typeof useChangeManager>;
