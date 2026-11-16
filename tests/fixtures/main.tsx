/** Test-only entry point. Never imported by the production app or Vite app build. */
import { createRoot } from 'react-dom/client';
import { createElement, useState } from 'react';
import { FixtureBoundary, resolveRegistry } from '@wdf/adapter-react';
import { unwrap } from '@wdf/core';
import {
  componentRegistry,
  selectRegistration,
} from '../../apps/task-manager/wdf/registry';
import manifest from '../../apps/task-manager/wdf/project.json';
import tokens from '../../apps/task-manager/wdf/tokens.json';
import { Select } from '../../apps/task-manager/src/components/Select';
import { Checkbox } from '../../apps/task-manager/src/components/Checkbox';
import '../../apps/task-manager/src/app.css';
const params = new URLSearchParams(location.search);
const id = params.get('component') ?? 'task-card';
const fixtureId = params.get('fixture') ?? 'comfortable';
function Broken(): never {
  throw new Error('M2 intentional isolated render failure');
}
function InteractiveCheckbox() {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      label="Teljesítés"
      checked={checked}
      onChange={(event) => setChecked(event.target.checked)}
    />
  );
}
function InteractiveSelect() {
  const props = selectRegistration.fixtures[0]!.props;
  const [value, setValue] = useState(props.value);
  return (
    <Select
      {...props}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
const registry = unwrap(resolveRegistry(manifest, tokens, componentRegistry));
if (registry.diagnostics.length)
  throw new Error(JSON.stringify(registry.diagnostics));
const entry = registry.entries.find((item) => item.id === id);
const element =
  id === 'broken' ? (
    createElement(Broken)
  ) : id === 'interactive-checkbox' ? (
    createElement(InteractiveCheckbox)
  ) : id === 'interactive-select' ? (
    createElement(InteractiveSelect)
  ) : entry ? (
    unwrap(entry.renderFixture(fixtureId))
  ) : (
    <p role="alert">Ismeretlen komponens: {id}</p>
  );
createRoot(document.getElementById('fixture-root')!).render(
  <div className="fixture-shell">
    <FixtureBoundary
      componentId={id}
      fixtureId={fixtureId}
      onError={(diagnostic) => {
        document.getElementById('diagnostic')!.textContent =
          JSON.stringify(diagnostic);
      }}
    >
      {element}
    </FixtureBoundary>
    <p id="diagnostic" />
    <button
      type="button"
      onClick={() => {
        document.getElementById('healthy')!.textContent = 'Működik';
      }}
    >
      Egészséges szomszéd
    </button>
    <output id="healthy" />
  </div>,
);
