import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Layers2,
  Plus,
  Pencil,
  ListChecks,
} from 'lucide-react';
import { Button } from './components/Button';
import { Checkbox } from './components/Checkbox';
import { Select } from './components/Select';
import { StatusBadge } from './components/StatusBadge';
import { TaskCard } from './components/TaskCard';
import { TaskForm } from './tasks/TaskForm';
import {
  filterTasks,
  initialTasks,
  type Task,
  type TaskFilter,
  type TaskValues,
} from './tasks/model';

const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};
const snapshot = () => window.location.hash;
const serverSnapshot = () => '';
export function App() {
  const [tasks, setTasks] = useState<readonly Task[]>(initialTasks);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [editor, setEditor] = useState<{ task?: Task } | null>(null);
  const [message, setMessage] = useState('');
  const nextId = useRef(7);
  const hash = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const detailId = hash.startsWith('#tasks/')
    ? hash.slice('#tasks/'.length)
    : null;
  const selected = tasks.find((task) => task.id === detailId);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousDetail = useRef(detailId);
  const newButton = useRef<HTMLButtonElement>(null);
  const completed = tasks.filter((task) => task.completed).length;
  const visible = filterTasks(tasks, filter);
  useEffect(() => {
    document.title = `${detailId ? (selected?.title ?? 'A feladat nem található') : 'Feladataim'} · Lépés`;
    if (previousDetail.current !== detailId) heading.current?.focus();
    previousDetail.current = detailId;
  }, [detailId, selected?.title]);
  function toggle(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    setTasks((items) =>
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
    setMessage(
      `${task.completed ? 'A feladat újra nyitott.' : 'A feladat elkészült.'} ${completed + (task.completed ? -1 : 1)}/${tasks.length} kész.`,
    );
    if (!detailId && filter !== 'all') {
      const index = visible.findIndex((item) => item.id === id);
      requestAnimationFrame(() => {
        const controls = document.querySelectorAll<HTMLInputElement>(
          '.task-list input[type="checkbox"]',
        );
        (
          controls[Math.min(index, controls.length - 1)] ??
          document.querySelector<HTMLSelectElement>('.select')
        )?.focus();
      });
    }
  }
  function save(values: TaskValues) {
    if (!editor) return;
    const editing = editor.task;
    const value = {
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
    };
    const createdId = `task-${String(nextId.current).padStart(3, '0')}`;
    if (!editing) nextId.current++;
    setTasks((items) =>
      editing
        ? items.map((item) =>
            item.id === editing.id ? { ...item, ...value } : item,
          )
        : [...items, { id: createdId, ...value }],
    );
    // Keep the owning list's filter, except when it would hide the saved task.
    if (filter !== 'all' && value.completed !== (filter === 'completed'))
      setFilter('all');
    setEditor(null);
    setMessage(editing ? 'A módosítások mentve.' : 'Az új feladat létrejött.');
    if (detailId) window.location.hash = 'tasks';
    requestAnimationFrame(() => newButton.current?.focus());
  }
  return (
    <>
      <a className="skip-link" href="#tartalom">
        Ugrás a tartalomhoz
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <a href="#tasks" className="brand">
            <span className="brand__mark">
              <Layers2 aria-hidden="true" />
            </span>
            <span>
              Lépés<span className="brand__subtitle">Feladatkezelő</span>
            </span>
          </a>
          <span className="workspace-label">
            <span className="workspace-label__dot" /> Saját munkatér
          </span>
        </div>
      </header>
      <main id="tartalom" className="workspace" tabIndex={-1}>
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              KEVESEBB FEJBEN TARTANI. TÖBBET ELVÉGEZNI.
            </p>
            <h1 ref={heading} tabIndex={-1}>
              {detailId
                ? selected
                  ? 'A feladat részletei'
                  : 'Nincs ilyen feladat'
                : 'Feladataim'}
            </h1>
            <p className="page-intro">
              {detailId
                ? 'Egy helyen minden, ami a következő lépéshez kell.'
                : 'Adj helyet a teendőknek, és haladj a saját ritmusodban.'}
            </p>
          </div>
          <Button ref={newButton} icon={<Plus />} onClick={() => setEditor({})}>
            Új feladat
          </Button>
        </div>
        <p className="feedback" role="status" aria-live="polite">
          {message || '\u00a0'}
        </p>
        {detailId ? (
          <>
            <a className="back-link" href="#tasks">
              <ArrowLeft aria-hidden="true" /> Vissza a feladatokhoz
            </a>
            {selected ? (
              <article className="task-detail">
                <div className="task-detail__meta">
                  <span className="task-id">
                    {selected.id.replace('task-', 'F–')}
                  </span>
                  <StatusBadge completed={selected.completed} />
                </div>
                <h2>{selected.title}</h2>
                <p className="task-detail__description">
                  {selected.description ||
                    'Még nincs leírás. Szerkesztéskor hozzáadhatod a részleteket.'}
                </p>
                <div className="task-detail__actions">
                  <Checkbox
                    label={
                      selected.completed
                        ? 'Elkészült · teljesítés visszavonása'
                        : 'Elkészült a feladat'
                    }
                    checked={selected.completed}
                    onChange={() => toggle(selected.id)}
                  />
                  <Button
                    variant="secondary"
                    icon={<Pencil />}
                    onClick={() => setEditor({ task: selected })}
                  >
                    Szerkesztés
                  </Button>
                </div>
              </article>
            ) : (
              <div className="empty-state" role="alert">
                <ListChecks aria-hidden="true" />
                <h2>A feladat nem található</h2>
                <p>
                  A feladat ebben a munkamenetben nem érhető el. Újratöltéskor a
                  kezdő feladatlista áll vissza.
                </p>
                <a className="text-link" href="#tasks">
                  Megnyitom a feladatlistát <ArrowRight aria-hidden="true" />
                </a>
              </div>
            )}
          </>
        ) : (
          <>
            <section className="progress-panel" aria-label="Haladás">
              <div className="progress-panel__copy">
                <span className="progress-panel__icon">
                  <Check aria-hidden="true" />
                </span>
                <div>
                  <h2>Minden lépés számít.</h2>
                  <p>
                    <strong>{completed}</strong> kész a {tasks.length}{' '}
                    feladatból
                  </p>
                </div>
              </div>
              <div
                className="progress-steps"
                role="img"
                aria-label={`${completed} kész, ${tasks.length - completed} nyitott feladat`}
              >
                {tasks.slice(0, 12).map((task, index) => (
                  <span
                    key={task.id}
                    data-done={
                      index <
                      Math.round(
                        (completed / tasks.length) * Math.min(tasks.length, 12),
                      )
                    }
                  />
                ))}
              </div>
            </section>
            <div className="list-toolbar">
              <div>
                <h2>
                  Feladatlista <span className="count">{visible.length}</span>
                </h2>
                <p className="muted">
                  A címre kattintva megnyithatod a részleteket.
                </p>
              </div>
              <Select
                label="Állapot"
                value={filter}
                options={[
                  { value: 'all', label: 'Minden feladat' },
                  { value: 'open', label: 'Nyitott' },
                  { value: 'completed', label: 'Kész' },
                ]}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === 'all' ||
                    value === 'open' ||
                    value === 'completed'
                  )
                    setFilter(value);
                }}
              />
            </div>
            {visible.length ? (
              <ul className="task-list" aria-label="Feladatok">
                {visible.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      onToggle={toggle}
                      href={`#tasks/${task.id}`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <ListChecks aria-hidden="true" />
                <h2>
                  {filter === 'open'
                    ? 'Minden feladat elkészült'
                    : 'Még nincs kész feladat'}
                </h2>
                <p>
                  {filter === 'open'
                    ? 'Jóleső üres lista. Jöhet a következő lépés, amikor készen állsz rá.'
                    : 'Jelölj késznek egy feladatot, és itt is megtalálod.'}
                </p>
                <Button variant="secondary" onClick={() => setFilter('all')}>
                  Minden feladat megjelenítése
                </Button>
              </div>
            )}
          </>
        )}
        <footer className="workspace-footer">
          <span>Lépésről lépésre.</span>
          <p>Próbamunkatér · A módosítások újratöltésig maradnak meg.</p>
        </footer>
      </main>
      {editor && (
        <TaskForm
          task={editor.task}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
