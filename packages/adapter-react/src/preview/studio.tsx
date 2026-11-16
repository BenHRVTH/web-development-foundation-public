import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { unwrap, type Diagnostic } from '@wdf/core';
import { FixtureBoundary } from '../registry/FixtureBoundary';
import { resolveRegistry, type RegistryEntry } from '../registry/index';
import './studio.css';

function FixtureView({
  entry,
  fixtureId,
}: {
  entry: RegistryEntry;
  fixtureId: string;
}) {
  const [failure, setFailure] = useState('');
  // Defer both schema validation and element creation until inside FixtureBoundary.
  const element = unwrap(entry.renderFixture(fixtureId, true));
  return (
    <>
      <FixtureBoundary
        componentId={entry.id}
        fixtureId={fixtureId}
        onError={(d) => setFailure(d.message)}
      >
        {element}
      </FixtureBoundary>
      {failure && (
        <p role="alert">
          {entry.id} / {fixtureId}: {failure}
        </p>
      )}
    </>
  );
}
function Diagnostics({ diagnostics }: { diagnostics: readonly Diagnostic[] }) {
  return (
    <div className="studio-errors" role="alert">
      {diagnostics.map((d, i) => (
        <p key={i}>
          <strong>{d.code}</strong>
          <code>{d.path}</code>
          {d.message}
        </p>
      ))}
    </div>
  );
}
export function mountStudio(
  manifest: unknown,
  config: unknown,
  entries: readonly RegistryEntry[],
) {
  const resolved = resolveRegistry(manifest, config, entries, {
    fixtureIsolation: true,
    repair: true,
  });
  const params = new URLSearchParams(location.search);
  const id = params.get('component');
  const entry = resolved.ok
    ? resolved.value.entries.find((e) => e.id === id)
    : undefined;
  const fixtureId = params.get('fixture');
  const fixture = entry?.fixtures.find((f) => f.id === fixtureId);
  const fixtures =
    params.get('compare') === 'true'
      ? (entry?.variants
          .map((v) => entry.fixtures.find((f) => f.variant === v))
          .filter((f) => f !== undefined) ?? [])
      : fixture
        ? [fixture]
        : [];
  createRoot(document.getElementById('studio-root')!).render(
    <main className="studio-fixtures">
      {entry && fixtures.length ? (
        fixtures.map((f) => {
          const errors = resolved.ok
            ? resolved.value.diagnostics.filter(
                (d) =>
                  d.path.includes(`registry[${JSON.stringify(entry.id)}]`) &&
                  d.path.includes(`fixtures[${JSON.stringify(f.id)}]`),
              )
            : [];
          return (
            <section
              key={`${entry.id}/${f.id}`}
              className="studio-specimen"
              data-component={entry.id}
              data-fixture={f.id}
              aria-label={`${entry.name} / ${f.variant} / ${f.state}`}
            >
              <h1>
                {entry.name}{' '}
                <span>
                  {f.variant} · {f.state}
                </span>
              </h1>
              {errors.length ? (
                <Diagnostics diagnostics={errors} />
              ) : (
                <FixtureBoundary
                  key={`${entry.id}/${f.id}`}
                  componentId={entry.id}
                  fixtureId={f.id}
                >
                  <FixtureView entry={entry} fixtureId={f.id} />
                </FixtureBoundary>
              )}
            </section>
          );
        })
      ) : (
        <Diagnostics
          diagnostics={
            resolved.ok
              ? [
                  {
                    code: 'STUDIO_FIXTURE_UNAVAILABLE',
                    phase: 'resolution',
                    path: `${id}/${fixtureId}`,
                    message:
                      'Válassz elérhető komponenst és fixture-t a galériából.',
                  },
                  ...resolved.value.diagnostics,
                ]
              : resolved.diagnostics
          }
        />
      )}
    </main>,
  );
}
