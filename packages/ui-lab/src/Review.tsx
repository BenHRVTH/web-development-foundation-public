import { useEffect, useRef, useState } from 'react';
import {
  ClipboardCheck,
  History,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { canApprove, changesBetween } from '@wdf/core/change';
import type { ChangeClient } from './useChangeManager';
import project from 'virtual:wdf-project';

export function Review({
  manager,
  onNavigate,
}: {
  manager: ChangeClient;
  onNavigate: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'audit' | 'changes'>('audit');
  const [confirm, setConfirm] = useState<{
    configurationDigest: string;
    runId: string;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const value = manager.view!;
  const { state, context, findings } = value;
  const qa = state.qa;
  const busy = !!manager.pending;
  const blocked = busy || !!manager.error || value.compatibility === 'conflict';
  const eligible = canApprove(qa, context) && !blocked;
  const reference = state.baseline ?? state.initial;
  const changes = value.referenceCompatible
    ? changesBetween(reference.config, state.draft)
    : [];
  useEffect(() => {
    const element = dialog.current;
    if (!confirm || !element) return;
    element.showModal();
    cancel.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previous;
      trigger.current?.focus();
    };
  }, [confirm]);
  return (
    <section className="review" aria-label="Review panel">
      <div className="review-heading">
        <button
          type="button"
          className="review-toggle"
          aria-expanded={open}
          aria-controls="review-body"
          onClick={() => setOpen(!open)}
        >
          <ClipboardCheck size={18} aria-hidden="true" /> Review
          <span>
            {findings.filter((f) => f.severity === 'blocker').length} blocker ·{' '}
            {changes.length} módosított érték
          </span>
          {open ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </button>
        <span role="status" className="save-status">
          {manager.error
            ? 'Mentési hiba'
            : busy
              ? 'Mentés folyamatban…'
              : `Working Draft mentve · r${state.revision}`}
        </span>
      </div>
      <div id="review-body" hidden={!open}>
        <nav className="review-tabs" aria-label="Review fülek">
          <button
            type="button"
            aria-pressed={tab === 'audit'}
            onClick={() => setTab('audit')}
          >
            <ClipboardCheck size={16} aria-hidden="true" /> Audit
          </button>
          <button
            type="button"
            aria-pressed={tab === 'changes'}
            onClick={() => setTab('changes')}
          >
            <History size={16} aria-hidden="true" /> Changes
          </button>
        </nav>
        {manager.error && (
          <div className="review-error" role="alert">
            <p>{manager.error}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void manager.refresh(true)}
            >
              Mentett Draft visszatöltése
            </button>
          </div>
        )}
        {value.diagnostic && (
          <p className="review-error" role="alert">
            {value.diagnostic}
          </p>
        )}
        {tab === 'audit' ? (
          <div className="review-content">
            <div className="review-actions">
              <h2>Live Validation</h2>
              <button
                type="button"
                disabled={blocked || !!qa?.running}
                onClick={() =>
                  void manager.perform({ type: 'qa', level: 'targeted' })
                }
              >
                Targeted QA futtatása
              </button>
              <button
                type="button"
                disabled={blocked || !!qa?.running}
                onClick={() =>
                  void manager.perform({ type: 'qa', level: 'approval' })
                }
              >
                Approval QA futtatása
              </button>
            </div>
            <p>
              A javítási javaslatok egyenként alkalmazhatók. Az automatikus
              ellenőrzés nem teljes WCAG-megfelelőségi tanúsítás.
            </p>
            <ul className="audit-list">
              {findings.map((f) => (
                <li key={f.id} data-severity={f.severity}>
                  <div className="finding-title">
                    <strong>
                      {f.status} · {f.severity}
                    </strong>
                    <code>{f.ruleId}</code>
                  </div>
                  <p>{f.description}</p>
                  {state.draft.tokens[f.target] ||
                  f.target === 'website' ||
                  project.catalog.entries.some((e) => e.id === f.target) ? (
                    <button
                      type="button"
                      className="finding-target"
                      onClick={() => onNavigate(f.target)}
                    >
                      {f.target}
                    </button>
                  ) : (
                    <code>{f.target}</code>
                  )}
                  <details>
                    <summary>Bizonyítékok és azonosítók</summary>
                    {f.evidence.map((e, i) => (
                      <pre key={i}>{e}</pre>
                    ))}
                    <p>
                      Konfiguráció: <code>{f.configurationDigest}</code>
                    </p>
                    <p>
                      Forrás: <code>{f.sourceRevision}</code>
                    </p>
                    <p>
                      Környezet: <code>{f.environment}</code>
                    </p>
                  </details>
                  {f.proposal && (
                    <div className="proposal">
                      <p>
                        Javaslat:{' '}
                        <code>{JSON.stringify(f.proposal.changes)}</code>
                      </p>
                      {f.decision === 'rejected' ? (
                        <p>Elutasítva · a szabálysértés továbbra is blokkol.</p>
                      ) : (
                        <div className="review-actions">
                          <button
                            type="button"
                            disabled={blocked}
                            onClick={() =>
                              void manager.perform({
                                type: 'accept',
                                findingId: f.id,
                              })
                            }
                          >
                            Javítás elfogadása
                          </button>
                          <button
                            type="button"
                            disabled={blocked}
                            onClick={() =>
                              void manager.perform({
                                type: 'reject',
                                findingId: f.id,
                              })
                            }
                          >
                            Javaslat elutasítása
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <section
              className="qa-results"
              aria-label="QA eredmények"
              aria-busy={qa?.running ?? false}
            >
              <h3>
                QA ·{' '}
                {qa
                  ? qa.level === 'approval'
                    ? 'Approval'
                    : 'Targeted'
                  : 'még nem futott'}
              </h3>
              <p role="status" data-qa-status={qa?.status ?? 'NOT_RUN'}>
                {qa?.running ? 'QA fut…' : (qa?.status ?? 'NOT_RUN')}
              </p>
              {qa?.running && qa.progress && (
                <p>
                  {qa.progress.completed} / {qa.progress.total} ellenőrzött
                  állapot · {qa.progress.current}
                </p>
              )}
              {qa && (
                <p>
                  Futás: <code>{qa.id}</code> ·{' '}
                  {new Date(qa.startedAt).toLocaleString('hu-HU', {
                    timeZone: 'Europe/Budapest',
                  })}{' '}
                  Europe/Budapest
                </p>
              )}
              {qa?.checks.map((c) => (
                <details key={c.id}>
                  <summary>
                    {c.status} · {c.ruleId} · {c.description}
                  </summary>
                  {c.evidence.map((e, i) => (
                    <pre key={i}>{e}</pre>
                  ))}
                </details>
              ))}
            </section>
          </div>
        ) : (
          <div className="review-content">
            <div className="review-actions">
              <h2>Working Draft változásai</h2>
              <button
                type="button"
                disabled={blocked || state.cursor === 0}
                onClick={() => void manager.perform({ type: 'undo' })}
              >
                <Undo2 size={16} aria-hidden="true" /> Undo
              </button>
              <button
                type="button"
                disabled={blocked || state.cursor === state.history.length}
                onClick={() => void manager.perform({ type: 'redo' })}
              >
                <Redo2 size={16} aria-hidden="true" /> Redo
              </button>
            </div>
            <p>
              Összehasonlítás:{' '}
              {state.baseline
                ? 'Approved Baseline'
                : 'Initial Reference (nem jóváhagyott)'}
              . Az automatikus mentés nem jelent jóváhagyást.
            </p>
            <details>
              <summary>Mentési hely és konfigurációazonosító</summary>
              <code>{value.saveLocation}</code>
              <p>
                <code>{context.configurationDigest}</code>
              </p>
            </details>
            {changes.length ? (
              <ul className="changes-list">
                {changes.map((c) => (
                  <li key={`${c.tokenId}/${c.responsive ?? ''}`}>
                    <button type="button" onClick={() => onNavigate(c.tokenId)}>
                      {c.tokenId}
                    </button>
                    <span>
                      {c.scope.kind}
                      {c.scope.kind !== 'global' ? ` / ${c.scope.family}` : ''}
                      {c.scope.kind === 'variant'
                        ? ` / ${c.scope.variant}`
                        : ''}
                      {c.responsive ? ` / ${c.responsive}` : ''}
                    </span>
                    <code>
                      {JSON.stringify(c.before)} → {JSON.stringify(c.after)}
                    </code>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nincs eltérés a referenciához képest.</p>
            )}
            <details>
              <summary>
                Művelettörténet · {state.cursor}/{state.history.length}
              </summary>
              <ol>
                {state.history.map((entry, i) => (
                  <li key={entry.id} data-applied={i < state.cursor}>
                    <strong>{entry.label}</strong> ·{' '}
                    {i < state.cursor ? 'alkalmazva' : 'visszavonva'}
                    <ul>
                      {entry.changes.map((c) => (
                        <li key={`${c.tokenId}/${c.responsive ?? ''}`}>
                          <code>{c.tokenId}</code> · {c.scope.kind}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </details>
            <div className="approval-section">
              <h3>Jóváhagyás előkészítése</h3>
              <p>
                Aktuális Approval QA: <strong>{qa?.status ?? 'NOT_RUN'}</strong>
                . Sikeres ellenőrzés után külön megerősítés szükséges.
              </p>
              <button
                type="button"
                disabled={blocked || !!qa?.running}
                onClick={() =>
                  void manager.perform({ type: 'qa', level: 'approval' })
                }
              >
                Approval QA futtatása
              </button>
              <button
                ref={trigger}
                type="button"
                disabled={!eligible}
                onClick={() =>
                  qa &&
                  setConfirm({
                    configurationDigest: context.configurationDigest,
                    runId: qa.id,
                  })
                }
              >
                Draft jóváhagyása…
              </button>
              {state.baseline && (
                <p className="baseline-status" role="status">
                  Approved Baseline · {state.baseline.approval.id} ·{' '}
                  {new Date(state.baseline.approval.approvedAt).toLocaleString(
                    'hu-HU',
                    { timeZone: 'Europe/Budapest' },
                  )}{' '}
                  Europe/Budapest
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      <dialog
        ref={dialog}
        className="approval-dialog"
        aria-labelledby="approval-title"
        aria-describedby="approval-description"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              'button:not(:disabled)',
            ),
          ].filter((el) => el.getClientRects().length > 0);
          const first = controls[0],
            last = controls.at(-1);
          if (!first) {
            event.preventDefault();
            event.currentTarget.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        onCancel={(e) => {
          e.preventDefault();
          setConfirm(null);
        }}
      >
        {confirm && (
          <>
            <h2 id="approval-title">Working Draft jóváhagyása</h2>
            <p id="approval-description">
              A teljes Draft lesz a hiteles projektkonfiguráció és az új
              Approved Baseline. A CSS és TypeScript kimenet együtt frissül. Az
              Initial Reference megmarad. Git-commit, push és publikálás nem
              történik.
            </p>
            <p>
              Ellenőrzött konfiguráció:{' '}
              <code>{confirm.configurationDigest}</code>
            </p>
            <p>Approval QA: {qa?.status ?? 'NOT_RUN'}</p>
            <div className="review-actions">
              <button
                ref={cancel}
                type="button"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Mégse
              </button>
              <button
                type="button"
                disabled={
                  !eligible ||
                  confirm.configurationDigest !== context.configurationDigest ||
                  confirm.runId !== qa?.id
                }
                onClick={async () => {
                  if (
                    qa &&
                    (await manager.perform({
                      type: 'approve',
                      runId: confirm.runId,
                      configurationDigest: confirm.configurationDigest,
                      confirmed: true,
                    }))
                  )
                    setConfirm(null);
                }}
              >
                Jóváhagyás és véglegesítés
              </button>
            </div>
            {manager.error && <p role="alert">{manager.error}</p>}
          </>
        )}
      </dialog>
    </section>
  );
}
