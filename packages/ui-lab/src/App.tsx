import { TypographyProvider, TypographyStatus } from './Typography';
import { useEffect, useState } from 'react';
import {
  Globe2,
  SlidersHorizontal,
  PanelRightClose,
  PanelRightOpen,
  LockKeyhole,
  RefreshCw,
  CircleAlert,
  Palette,
  Type,
  Space,
  Shapes,
  LayoutTemplate,
} from 'lucide-react';
import {
  foundationTokens,
  generateTokenCss,
  updateTokensInScope,
  type Diagnostic,
  type TokenValue,
  type Token,
} from '@wdf/core';
import project from 'virtual:wdf-project';
import { registryTokenIds } from '@wdf/adapter-react';
import { Studio, PreviewStatusLabel, type WorkspaceConnection } from './Studio';
import { categories, categoryOf, type Category } from './editor';
import { TokenField } from './TokenField';
import { usePreview } from './usePreview';
import { useViewport } from './useViewport';
import { useChangeManager, type ChangeClient } from './useChangeManager';
import { Review } from './Review';
import { ComparisonControl } from './ComparisonControl';

const componentTokenIds = registryTokenIds(project.catalog);
const icons = {
  Colors: Palette,
  Typography: Type,
  Spacing: Space,
  Shapes,
  Layout: LayoutTemplate,
};
export function App() {
  const manager = useChangeManager();
  if (!manager.view)
    return (
      <div className="lab-start">
        <h1>WDF UI Lab</h1>
        <p role="status">{manager.error || 'Working Draft betöltése…'}</p>
        {manager.error && (
          <button type="button" onClick={() => void manager.refresh(true)}>
            Újrapróbálás
          </button>
        )}
      </div>
    );
  return (
    <TypographyProvider manager={manager}>
      <Lab manager={manager} />
    </TypographyProvider>
  );
}
function Lab({ manager }: { manager: ChangeClient }) {
  const [studioConnection, setStudioConnection] =
    useState<WorkspaceConnection | null>(null);
  const [workspace, setWorkspace] = useState<'website' | 'studio'>('website');
  const [studioVisited, setStudioVisited] = useState(false);
  const config = manager.view!.state.draft;
  const [comparison, setComparison] = useState<'A' | 'B'>('B');
  const [navigation, setNavigation] = useState<{
    id: string;
    nonce: number;
  } | null>(null);
  const view = manager.view!;
  const reference = view.state.baseline ?? view.state.initial;
  const referenceValid =
    view.referenceCompatible && generateTokenCss(reference.config).ok;
  const referenceShown = comparison === 'A' && referenceValid;
  const readOnly =
    referenceShown || view.compatibility === 'conflict' || !!manager.error;
  const previewConfig = referenceShown ? reference.config : config;
  const [category, setCategory] = useState<Category>('Colors');
  const { canvas, width, setWidth, minimum, belowMinimum } = useViewport(
    project.widths,
  );
  const [panel, setPanel] = useState(true);
  const [responsive, setResponsive] = useState('');
  const [reload, setReload] = useState(0);
  const [reloadPrompt, setReloadPrompt] = useState(false);
  const css = generateTokenCss(config);
  const diagnostics: Diagnostic[] = css.ok ? [] : css.diagnostics;
  const preview = usePreview(
    project.connection,
    previewConfig,
    componentTokenIds,
  );
  const globals = Object.entries(config.tokens).filter(
    ([, t]) => t.scope.kind === 'global',
  );
  const tokens = globals.filter(
    ([id, token]) =>
      categoryOf(id, token) === category &&
      (!responsive ||
        Object.hasOwn(config.responsive?.[responsive]?.overrides ?? {}, id)),
  );
  const primitives = tokens.filter(([id]) => id.startsWith('primitive.'));
  const semantics = tokens.filter(([id]) => id.startsWith('semantic.'));
  useEffect(() => {
    document.title = `${workspace === 'website' ? 'Website View' : 'Component Studio'} · WDF UI Lab`;
  }, [workspace]);
  useEffect(() => {
    if (!navigation) return;
    let frame = 0,
      attempts = 0;
    function focus() {
      if (navigation!.id === 'website') {
        document.getElementById('website-preview')?.focus();
        return;
      }
      const component = [
        ...document.querySelectorAll<HTMLElement>('[data-registry-component]'),
      ].find(
        (el) =>
          el.dataset['registryComponent'] === navigation!.id &&
          !el.closest('[hidden]'),
      );
      if (component) {
        component.scrollIntoView({ block: 'center' });
        component.focus();
        return;
      }
      const field = [
        ...document.querySelectorAll<HTMLElement>('[data-token]'),
      ].find(
        (el) =>
          el.dataset['token'] === navigation!.id && !el.closest('[hidden]'),
      );
      if (field) {
        let parent = field.parentElement;
        while (parent) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
          parent = parent.parentElement;
        }
        field.scrollIntoView({ block: 'center' });
        (
          field.querySelector<HTMLElement>('input:not([type="color"])') ??
          field.querySelector<HTMLElement>('.field-control select')
        )?.focus();
      } else if (++attempts < 60) frame = requestAnimationFrame(focus);
    }
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [navigation, workspace]);
  function navigate(id: string) {
    const token = config.tokens[id];
    if (!token) {
      if (id === 'website') {
        setWorkspace('website');
        setComparison('B');
        setNavigation({ id, nonce: Date.now() });
      } else if (project.catalog.entries.some((e) => e.id === id)) {
        setStudioVisited(true);
        setWorkspace('studio');
        setComparison('B');
        setNavigation({ id, nonce: Date.now() });
      }
      return;
    }
    setComparison('B');
    if (token.scope.kind === 'global') {
      setWorkspace('website');
      setPanel(true);
      setCategory(categoryOf(id, token));
      setResponsive('');
    } else {
      setStudioVisited(true);
      setWorkspace('studio');
    }
    setNavigation({ id, nonce: Date.now() });
  }
  function edit(
    id: string,
    value: TokenValue,
    target?: string,
    gestureId?: string,
  ): string {
    return editScope({ kind: 'global' }, id, value, target, gestureId);
  }
  function editScope(
    scope: Token['scope'],
    id: string,
    value: TokenValue,
    target?: string,
    gestureId?: string,
  ): string {
    if (readOnly)
      return 'A referencia csak olvasható, vagy a mentési szolgáltatás blokkolt.';
    if (scope.kind !== 'global' && !componentTokenIds.includes(id))
      return `PREVIEW_SCOPE_FORBIDDEN ${id}`;
    const result = updateTokensInScope(
      project.manifest,
      config,
      scope,
      { [id]: value },
      target ? { responsive: target } : {},
    );
    if (!result.ok)
      return result.diagnostics
        .map((d) => `${d.code} ${d.path}: ${d.message}`)
        .join(' ');
    void manager.perform({
      type: 'edit',
      ...(gestureId ? { gestureId } : {}),
      patch: {
        scope,
        changes: { [id]: value },
        ...(target ? { responsive: target } : {}),
      },
    });
    return '';
  }
  function fields(items: typeof tokens) {
    return items.map(([id]) => (
      <TokenField
        key={`${manager.fieldEpoch}/${responsive}/${id}`}
        id={id}
        config={referenceShown ? reference.config : config}
        validationError={diagnostics
          .filter((d) => d.path.includes(id))
          .map((d) => `${d.code}: ${d.message}`)
          .join(' ')}
        {...(responsive ? { responsive } : {})}
        onEdit={edit}
      />
    ));
  }
  return (
    <div className="lab">
      <a
        className="skip-link"
        href={workspace === 'website' ? '#website-preview' : '#studio-preview'}
      >
        Ugrás az előnézethez
      </a>
      <header className="lab-header">
        <div className="lab-brand">
          <span className="brand-mark" aria-hidden="true">
            <SlidersHorizontal size={20} />
          </span>
          <strong>
            WDF <span>UI Lab</span>
          </strong>
        </div>
        <span className="project-name">{project.manifest.project.name}</span>
        <nav className="workspace-nav" aria-label="UI Lab munkaterület">
          <button
            type="button"
            aria-pressed={workspace === 'website'}
            onClick={() => setWorkspace('website')}
          >
            Website View
          </button>
          <button
            type="button"
            aria-pressed={workspace === 'studio'}
            onClick={() => {
              setStudioVisited(true);
              setWorkspace('studio');
            }}
          >
            Component Studio
          </button>
        </nav>
        <span className="local-badge">Helyi munkamenet</span>
      </header>
      {(manager.error || view.diagnostic) && (
        <div className="change-notice" role="alert">
          <p>{manager.error || view.diagnostic}</p>
          {manager.error && (
            <button
              type="button"
              disabled={!!manager.pending}
              onClick={() => void manager.refresh(true)}
            >
              Mentett Draft visszatöltése
            </button>
          )}
        </div>
      )}
      <main hidden={workspace !== 'website'}>
        {studioConnection &&
          (studioConnection.status === 'error' ||
            studioConnection.status === 'disconnected') && (
            <div className="preview-notice" role="alert">
              <div>
                Component Studio: {studioConnection.error} A másik előnézet
                frissítése nem igazolt.
                <button type="button" onClick={studioConnection.reconnect}>
                  Component Studio újracsatlakoztatása
                </button>
              </div>
            </div>
          )}
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">PROJECT PREVIEW</p>
            <h1>
              <Globe2 size={22} aria-hidden="true" />
              Website View
            </h1>
          </div>
          <p>A valódi alkalmazás. Élő designbeállítások.</p>
        </div>
        <div className="lab-toolbar">
          <div
            className="viewport-control"
            role="group"
            aria-label="Előnézet szélessége"
          >
            <span className="toolbar-label">Viewport</span>
            {project.widths.map((w) => (
              <button
                type="button"
                key={w}
                aria-pressed={width === w}
                onClick={() => setWidth(w)}
              >
                {w}
                <span className="sr-only"> CSS px</span>
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <ComparisonControl
              referenceShown={referenceShown}
              referenceValid={referenceValid}
              onCompare={setComparison}
            />
            <PreviewStatusLabel status={preview.status} />
            <button
              type="button"
              className="panel-toggle"
              aria-expanded={panel}
              aria-controls="design-panel"
              onClick={() => setPanel(!panel)}
            >
              {panel ? (
                <PanelRightClose size={18} aria-hidden="true" />
              ) : (
                <PanelRightOpen size={18} aria-hidden="true" />
              )}
              <span>Beállítások</span>
            </button>
          </div>
        </div>
        <div className={`lab-workspace ${panel ? '' : 'panel-closed'}`}>
          <section
            className="preview-workspace"
            aria-label="Alkalmazás előnézete"
          >
            <div className="preview-caption">
              <span
                title={
                  referenceShown
                    ? reference.context.configurationDigest
                    : view.context.configurationDigest
                }
              >
                {referenceShown
                  ? `A · ${view.state.baseline ? 'Approved Baseline' : 'Initial Reference · nem jóváhagyott'}${view.referenceStale ? ' · elavult referencia, aktuális React-forrás' : ''}`
                  : 'B · Working Draft'}{' '}
                ·{' '}
                {(referenceShown
                  ? reference.context.configurationDigest
                  : view.context.configurationDigest
                ).slice(0, 8)}
              </span>
              <span>{width} × 900 CSS px · 100%</span>
            </div>
            {(preview.error || diagnostics.length > 0) && (
              <div className="preview-notice" role="alert">
                <CircleAlert size={18} aria-hidden="true" />
                <div>
                  {preview.error ||
                    'A konfiguráció hibás. Az előnézet az utolsó érvényes megjelenést mutatja; javítsd a jelzett tokeneket.'}
                  {preview.error && (
                    <button type="button" onClick={preview.reconnect}>
                      Újracsatlakozás
                    </button>
                  )}
                </div>
              </div>
            )}
            {belowMinimum && (
              <p className="viewport-notice" role="status">
                A preview-területen a legkisebb, {minimum} CSS px-es nézet sem
                fér el teljesen. A nézet mérete változatlan; görgess
                vízszintesen, vagy szélesítsd a Lab ablakát.
              </p>
            )}
            <div
              className="preview-scroll"
              ref={canvas}
              tabIndex={0}
              aria-label="Előnézet munkaterülete; vízszintesen görgethető"
            >
              <iframe
                key={reload}
                ref={preview.frame}
                id="website-preview"
                title={`${project.manifest.project.name} — valódi alkalmazás`}
                src={project.connection.previewOrigin}
                style={{
                  width,
                  height: 900,
                  backgroundColor: preview.canvasColor,
                  marginInlineStart: `max(0px, round(down, calc((100% - ${width}px) / 2), 1px))`,
                  marginInlineEnd: 0,
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                onLoad={preview.reconnect}
              />
            </div>
            <footer className="preview-footer">
              <span>
                A viewport tényleges szélessége változik. A nagyobb nézet
                görgethető.
              </span>
              <button type="button" onClick={() => setReloadPrompt(true)}>
                <RefreshCw size={14} aria-hidden="true" />
                Előnézet újratöltése
              </button>
            </footer>
            {reloadPrompt && (
              <div className="reload-notice" role="alert">
                <p>
                  Az újratöltés visszaállítja az alkalmazás adatait. A
                  munkamenet tokenbeállításai megmaradnak.
                </p>
                <button type="button" onClick={() => setReloadPrompt(false)}>
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReload((r) => r + 1);
                    setReloadPrompt(false);
                    preview.reconnect();
                  }}
                >
                  Újratöltés
                </button>
              </div>
            )}
          </section>
          {panel && (
            <aside
              id="design-panel"
              className="design-panel"
              aria-label="Globális designbeállítások"
            >
              <div className="panel-heading">
                <SlidersHorizontal size={18} aria-hidden="true" />
                <h2>Globális design</h2>
                <span>{globals.length}</span>
              </div>
              <p className="panel-intro">
                {referenceShown
                  ? 'A referencia csak olvasható. Szerkesztéshez válts a B · Draft nézetre.'
                  : 'A közös Working Draft helyben automatikusan mentődik. A projektforrás jóváhagyásig változatlan.'}
              </p>
              <nav className="category-nav" aria-label="Designkategóriák">
                {categories.map((c) => {
                  const Icon = icons[c];
                  return (
                    <button
                      type="button"
                      key={c}
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                    >
                      <Icon size={17} aria-hidden="true" />
                      {c}
                    </button>
                  );
                })}
              </nav>
              <div className="editor-body">
                <fieldset className="editor-fields" disabled={readOnly}>
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
                    <h3>{category}</h3>
                    <span>{tokens.length} token</span>
                  </div>
                  {category === 'Typography' && <TypographyStatus />}
                  {primitives.length > 0 && (
                    <section aria-label="Projekt alapértékek">
                      <h4>Projekt alapértékek</h4>
                      {fields(primitives)}
                    </section>
                  )}
                  {semantics.length > 0 && (
                    <details
                      open={primitives.length === 0}
                      key={`${category}/${responsive}`}
                    >
                      <summary>
                        Szemantikus szerepek <span>{semantics.length}</span>
                      </summary>
                      {fields(semantics)}
                    </details>
                  )}
                  {tokens.length === 0 && (
                    <p className="empty-fields">
                      Ebben a kategóriában nincs{' '}
                      {responsive
                        ? 'erre a töréspontra deklarált'
                        : 'globálisan szerkeszthető'}{' '}
                      token. Válassz másik kategóriát vagy hatókört.
                    </p>
                  )}
                  {category === 'Spacing' && (
                    <div
                      className="spacing-presets"
                      role="group"
                      aria-label="Spacing preset"
                    >
                      {(['compact', 'comfortable', 'spacious'] as const).map(
                        (name) => (
                          <button
                            type="button"
                            key={name}
                            disabled={!!manager.pending || !!responsive}
                            onClick={() =>
                              void manager.perform({ type: 'preset', name })
                            }
                          >
                            {name}
                          </button>
                        ),
                      )}
                      <p>
                        A kategória összes globális spacingértékét és deklarált
                        responsive értékét lecseréli. Egy Undo-lépés.
                      </p>
                    </div>
                  )}
                  {category === 'Spacing' && (
                    <details className="foundation">
                      <summary>
                        <LockKeyhole size={15} aria-hidden="true" />
                        Foundation · LOCKED
                      </summary>
                      <p>
                        A referencia-skála és a kártyapresetek zároltak. A
                        szemantikus térközök ezekre hivatkozhatnak.
                      </p>
                      <dl>
                        {Object.entries(foundationTokens()).map(([id, t]) => (
                          <div key={id}>
                            <dt>{id}</dt>
                            <dd>{t.value} px</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                  {diagnostics.length > 0 && (
                    <section className="diagnostics" aria-label="Tokenhibák">
                      <h4>Javítandó tokenek</h4>
                      {diagnostics.map((d, i) => (
                        <p key={i}>
                          <strong>{d.code}</strong>
                          <code>{d.path}</code>
                          {d.message}
                        </p>
                      ))}
                    </section>
                  )}
                </fieldset>
              </div>
              <footer className="editor-footer">
                <LockKeyhole size={14} aria-hidden="true" />
                <span>
                  {diagnostics.length
                    ? 'Hibás konfiguráció · nincs új CSS'
                    : preview.status === 'ready'
                      ? `Előnézet frissítve · ${preview.applied}`
                      : 'Előnézeti visszaigazolásra vár'}
                </span>
              </footer>
            </aside>
          )}
        </div>
      </main>
      {studioVisited && (
        <Studio
          hidden={workspace !== 'studio'}
          onStatus={setStudioConnection}
          websiteConnection={{
            status: preview.status,
            error: preview.error,
            reconnect: preview.reconnect,
          }}
          config={config}
          previewConfig={previewConfig}
          fieldEpoch={manager.fieldEpoch}
          comparison={{
            referenceShown,
            referenceValid,
            onCompare: setComparison,
          }}
          configurationLabel={
            referenceShown
              ? `A · ${view.state.baseline ? 'Approved Baseline' : 'Initial Reference · nem jóváhagyott'}${view.referenceStale ? ' · elavult referencia, aktuális forrás' : ''}`
              : 'B · Working Draft'
          }
          readOnly={readOnly}
          navigation={navigation}
          diagnostics={diagnostics}
          onEdit={editScope}
          componentTokenIds={componentTokenIds}
        />
      )}
      <Review manager={manager} onNavigate={navigate} />
    </div>
  );
}
