import { useEffect, useState } from 'react';
import {
  Boxes,
  Check,
  Cable,
  CircleAlert,
  SlidersHorizontal,
  LockKeyhole,
} from 'lucide-react';
import type {
  EditableTokenConfig,
  Token,
  TokenValue,
  Diagnostic,
} from '@wdf/core';
import project from 'virtual:wdf-project';
import { TokenField } from './TokenField';
import { usePreview, type PreviewStatus } from './usePreview';
import { useViewport } from './useViewport';
import { ComparisonControl, type ComparisonProps } from './ComparisonControl';

export const statusLabels: Record<PreviewStatus, string> = {
  loading: 'Előnézet betöltése',
  connecting: 'Kapcsolódás',
  ready: 'Élő kapcsolat',
  updating: 'Tokenek frissítése',
  error: 'Előnézeti hiba',
  disconnected: 'Megszakadt kapcsolat',
};
export function PreviewStatusLabel({ status }: { status: PreviewStatus }) {
  const Icon =
    status === 'ready'
      ? Check
      : status === 'error' || status === 'disconnected'
        ? CircleAlert
        : Cable;
  return (
    <span className="preview-status" role="status" data-state={status}>
      <Icon size={14} aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}
export interface WorkspaceConnection {
  status: PreviewStatus;
  error: string;
  reconnect: () => void;
}
export interface StudioProps {
  websiteConnection: WorkspaceConnection;
  onStatus: (state: WorkspaceConnection) => void;
  hidden: boolean;
  diagnostics: readonly Diagnostic[];
  config: EditableTokenConfig;
  previewConfig: EditableTokenConfig;
  fieldEpoch: number;
  comparison: ComparisonProps;
  configurationLabel: string;
  readOnly: boolean;
  navigation: { id: string; nonce: number } | null;
  componentTokenIds: readonly string[];
  onEdit: (
    scope: Token['scope'],
    id: string,
    value: TokenValue,
    responsive?: string,
    gestureId?: string,
  ) => string;
}
export function Studio({
  hidden,
  config,
  previewConfig,
  fieldEpoch,
  comparison,
  configurationLabel,
  readOnly,
  navigation,
  onEdit,
  componentTokenIds,
  diagnostics,
  websiteConnection,
  onStatus,
}: StudioProps) {
  const entries = project.catalog.entries;
  const [componentId, setComponentId] = useState(entries[0]?.id ?? '');
  const entry = entries.find((e) => e.id === componentId);
  const [fixtureId, setFixtureId] = useState(entry?.fixtures[0]?.id ?? '');
  const fixture = entry?.fixtures.find((f) => f.id === fixtureId);
  const [compare, setCompare] = useState(false);
  const [scope, setScope] = useState<'family' | 'variant'>('family');
  const [responsive, setResponsive] = useState('');
  const [panel, setPanel] = useState(true);
  const [reset, setReset] = useState(0);
  const viewport = useViewport(project.widths);
  const preview = usePreview(
    project.connection,
    previewConfig,
    componentTokenIds,
  );
  useEffect(() => {
    if (!navigation) return;
    const owner = entries.find(
      (e) =>
        e.id === navigation.id ||
        e.tokens.family.includes(navigation.id) ||
        Object.values(e.tokens.variants).some((ids) =>
          ids.includes(navigation.id),
        ),
    );
    if (!owner) return;
    const token = config.tokens[navigation.id];
    setComponentId(owner.id);
    setPanel(true);
    setResponsive('');
    setCompare(false);
    setScope(token?.scope.kind === 'variant' ? 'variant' : 'family');
    setFixtureId(
      owner.fixtures.find(
        (f) =>
          token?.scope.kind === 'variant' && f.variant === token.scope.variant,
      )?.id ??
        owner.fixtures[0]?.id ??
        '',
    );
  }, [navigation]);
  useEffect(() => {
    onStatus({
      status: preview.status,
      error: preview.error,
      reconnect: preview.reconnect,
    });
  }, [preview.status, preview.error, preview.reconnect, onStatus]);
  const tokenIds = entry
    ? scope === 'family'
      ? entry.tokens.family
      : (entry.tokens.variants[fixture?.variant ?? ''] ?? [])
    : [];
  const fields = tokenIds.filter(
    (id) =>
      config.tokens[id] &&
      (!responsive ||
        Object.hasOwn(config.responsive?.[responsive]?.overrides ?? {}, id)),
  );
  const url = new URL('/__wdf/studio', project.connection.previewOrigin);
  url.searchParams.set('component', componentId);
  url.searchParams.set('fixture', fixtureId);
  url.searchParams.set('compare', String(compare));
  function selectFixture(id: string) {
    setFixtureId(id);
    setCompare(false);
  }
  return (
    <main hidden={hidden} className="studio-main">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">REGISTERED COMPONENTS</p>
          <h1>
            <Boxes size={22} aria-hidden="true" />
            Component Studio
          </h1>
        </div>
        <p>Valódi komponensek. Közös designállapot.</p>
      </div>
      {(websiteConnection.status === 'error' ||
        websiteConnection.status === 'disconnected') && (
        <div className="preview-notice" role="alert">
          <div>
            Website View: {websiteConnection.error} A közös designállapot
            megmaradt, de a másik előnézet frissítése nem igazolt.
            <button type="button" onClick={websiteConnection.reconnect}>
              Website View újracsatlakoztatása
            </button>
          </div>
        </div>
      )}
      <nav className="component-gallery" aria-label="Komponensgaléria">
        {(['Primitive', 'Composite'] as const).map((category) => (
          <div className="gallery-group" key={category}>
            <h2>
              {category}
              <span>
                {entries.filter((e) => e.category === category).length}
              </span>
            </h2>
            <div>
              {entries
                .filter((e) => e.category === category)
                .map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    data-registry-component={e.id}
                    aria-pressed={e.id === componentId}
                    onClick={() => {
                      setComponentId(e.id);
                      setFixtureId(e.fixtures[0]?.id ?? '');
                      setResponsive('');
                    }}
                  >
                    {e.name}
                    <span>{e.fixtures.length} fixture</span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </nav>
      {project.catalog.diagnostics.length > 0 && (
        <details className="registry-notice" open>
          <summary>
            Registry-diagnosztika · {project.catalog.diagnostics.length}
          </summary>
          {project.catalog.diagnostics.map((d, i) => (
            <p key={i}>
              <strong>{d.code}</strong>
              <code>{d.path}</code>
              {d.message}
            </p>
          ))}
        </details>
      )}
      {entry && fixture ? (
        <>
          <div className="studio-selection">
            <div className="selected-component">
              <strong>{entry.name}</strong>
              <span>
                {entry.category} · {entry.family}
              </span>
            </div>
            <label>
              Variáns
              <select
                value={fixture.variant}
                onChange={(e) =>
                  selectFixture(
                    entry.fixtures.find((f) => f.variant === e.target.value)!
                      .id,
                  )
                }
              >
                {entry.variants.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Állapot
              <select
                value={fixture.state}
                onChange={(e) =>
                  selectFixture(
                    entry.fixtures.find(
                      (f) =>
                        f.variant === fixture.variant &&
                        f.state === e.target.value,
                    )!.id,
                  )
                }
              >
                {entry.states.map((state) => (
                  <option
                    key={state}
                    disabled={
                      !entry.fixtures.some(
                        (f) =>
                          f.variant === fixture.variant && f.state === state,
                      )
                    }
                  >
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fixture
              <select
                value={fixture.id}
                onChange={(e) => selectFixture(e.target.value)}
              >
                {entry.fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} · {f.variant} / {f.state}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="compare-toggle"
              aria-pressed={compare}
              onClick={() => setCompare(!compare)}
            >
              Összes variáns
            </button>
          </div>
          <div className="lab-toolbar">
            <div
              className="viewport-control"
              role="group"
              aria-label="Komponens-előnézet szélessége"
            >
              <span className="toolbar-label">Viewport</span>
              {project.widths.map((w) => (
                <button
                  type="button"
                  key={w}
                  aria-pressed={viewport.width === w}
                  onClick={() => viewport.setWidth(w)}
                >
                  {w}
                  <span className="sr-only"> CSS px</span>
                </button>
              ))}
            </div>
            <div className="toolbar-actions">
              <ComparisonControl {...comparison} />
              <PreviewStatusLabel status={preview.status} />
              <button
                type="button"
                className="panel-toggle"
                aria-expanded={panel}
                onClick={() => setPanel(!panel)}
              >
                <SlidersHorizontal size={18} aria-hidden="true" />
                Beállítások
              </button>
            </div>
          </div>
          <div className={`lab-workspace ${panel ? '' : 'panel-closed'}`}>
            <section
              className="preview-workspace"
              aria-label="Komponens előnézete"
            >
              <div className="preview-caption">
                <span>
                  {configurationLabel} · {entry.name} /{' '}
                  {compare
                    ? 'összes variáns'
                    : `${fixture.variant} / ${fixture.state}`}
                </span>
                <span>{viewport.width} × 900 CSS px · 100%</span>
              </div>
              {(preview.error || diagnostics.length > 0) && (
                <div className="preview-notice" role="alert">
                  <div>
                    {preview.error ||
                      'A konfiguráció hibás; az utolsó érvényes megjelenés látható. Javítsd a jelzett tokeneket.'}
                    {diagnostics.map((d, i) => (
                      <p key={i}>
                        <strong>{d.code}</strong> {d.path}: {d.message}
                      </p>
                    ))}
                    <button type="button" onClick={preview.reconnect}>
                      Újracsatlakozás
                    </button>
                  </div>
                </div>
              )}
              {viewport.belowMinimum && (
                <p className="viewport-notice">
                  A legkisebb nézet sem fér el teljesen. Görgess vízszintesen,
                  vagy szélesítsd a Lab ablakát.
                </p>
              )}
              <div
                className="preview-scroll"
                ref={viewport.canvas}
                tabIndex={0}
                aria-label="Komponens-előnézet munkaterülete; vízszintesen görgethető"
              >
                <iframe
                  key={reset}
                  ref={preview.frame}
                  id="studio-preview"
                  title={`${entry.name} — valódi komponens`}
                  src={url.href}
                  style={{
                    width: viewport.width,
                    height: 900,
                    backgroundColor: preview.canvasColor,
                    marginInlineStart: `max(0px, round(down, calc((100% - ${viewport.width}px) / 2), 1px))`,
                    marginInlineEnd: 0,
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  onLoad={preview.reconnect}
                />
              </div>
              <footer className="preview-footer">
                <span>
                  A fixture kiválasztása reprodukálható kezdőállapotot ad. Az
                  interakciók kipróbálhatók.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReset((n) => n + 1);
                    preview.reconnect();
                  }}
                >
                  Fixture visszaállítása
                </button>
              </footer>
            </section>
            {panel && (
              <aside
                className="design-panel"
                aria-label="Komponens designbeállítások"
              >
                <div className="panel-heading">
                  <SlidersHorizontal size={18} aria-hidden="true" />
                  <h2>Komponens design</h2>
                  <span>{tokenIds.length}</span>
                </div>
                <p className="panel-intro">
                  Az összes megfelelő előfordulásra hat, a Website View-ban is.
                  {readOnly
                    ? 'A referencia csak olvasható; szerkesztéshez válts a Draft nézetre.'
                    : 'A közös Working Draft helyben automatikusan mentődik.'}
                </p>
                <div
                  className="scope-nav"
                  role="group"
                  aria-label="Tokenszerkesztés hatóköre"
                >
                  {(['family', 'variant'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={s === scope}
                      onClick={() => setScope(s)}
                    >
                      Component {s === 'family' ? 'Family' : 'Variant'}
                    </button>
                  ))}
                </div>
                <div className="editor-body">
                  <fieldset className="editor-fields" disabled={readOnly}>
                    <p className="scope-context">
                      {entry.name}
                      {scope === 'variant'
                        ? ` / ${fixture.variant}`
                        : ' / minden variáns'}
                    </p>
                    <label className="responsive-label">
                      Értékek hatóköre
                      <select
                        value={responsive}
                        onChange={(e) => setResponsive(e.target.value)}
                      >
                        <option value="">Alap · minden viewport</option>
                        {Object.entries(config.responsive ?? {}).map(
                          ([name, rule]) => (
                            <option key={name} value={name}>
                              {name} · ≥ {rule.minWidth} px
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <div className="category-heading">
                      <h3>
                        {scope === 'family' ? 'Közös tokenek' : fixture.variant}
                      </h3>
                      <span>{fields.length} token</span>
                    </div>
                    {fields.map((id) => (
                      <TokenField
                        key={`${fieldEpoch}/${entry.id}/${scope}/${responsive}/${id}`}
                        id={id}
                        config={
                          comparison.referenceShown ? previewConfig : config
                        }
                        validationError={diagnostics
                          .filter((d) => d.path.includes(id))
                          .map((d) => `${d.code}: ${d.message}`)
                          .join(' ')}
                        {...(responsive ? { responsive } : {})}
                        onEdit={(id, value, target, gestureId) =>
                          onEdit(
                            scope === 'family'
                              ? { kind: 'family', family: entry.family }
                              : {
                                  kind: 'variant',
                                  family: entry.family,
                                  variant: fixture.variant,
                                },
                            id,
                            value,
                            target,
                            gestureId,
                          )
                        }
                      />
                    ))}
                    {!fields.length && (
                      <p className="empty-fields">
                        Nincs erre a hatókörre deklarált szerkeszthető token.
                        Válassz másik hatókört.
                      </p>
                    )}
                    <p className="empty-fields">
                      <LockKeyhole size={14} aria-hidden="true" /> Foundation
                      LOCKED. A zárolt értékek nem módosíthatók.
                    </p>
                  </fieldset>
                </div>
                <footer className="editor-footer">
                  <span>
                    {preview.status === 'ready'
                      ? `Előnézet frissítve · ${preview.applied}`
                      : statusLabels[preview.status]}
                  </span>
                </footer>
              </aside>
            )}
          </div>
        </>
      ) : (
        <p className="empty-fields">
          Nincs elérhető komponens. Ellenőrizd a Registry diagnosztikáját; a
          Website View tovább használható.
        </p>
      )}
    </main>
  );
}
