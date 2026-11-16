export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly completed: boolean;
}
export type TaskFilter = 'all' | 'open' | 'completed';
export interface TaskValues {
  title: string;
  description: string;
  completed: boolean;
}
export const TITLE_LIMIT = 160;
export const DESCRIPTION_LIMIT = 4000;
export function validateTask(values: TaskValues) {
  return {
    title: !values.title.trim()
      ? 'Adj nevet a feladatnak.'
      : values.title.trim().length > TITLE_LIMIT
        ? `A cím legfeljebb ${TITLE_LIMIT} karakter lehet. Rövidítsd le.`
        : '',
    description:
      values.description.trim().length > DESCRIPTION_LIMIT
        ? `A leírás legfeljebb ${DESCRIPTION_LIMIT} karakter lehet. Rövidítsd le.`
        : '',
  };
}
export function filterTasks(tasks: readonly Task[], filter: TaskFilter) {
  return tasks.filter(
    (task) => filter === 'all' || task.completed === (filter === 'completed'),
  );
}
export const initialTasks: readonly Task[] = [
  {
    id: 'task-001',
    title: 'Rajzold fel a fő felhasználói útvonalat',
    description:
      'A feladatlistától a sikeres mentésig: gyűjtsd össze a lépéseket, és jelöld a döntési pontokat. Az üres és hibás állapotokra is gondolj.',
    completed: false,
  },
  {
    id: 'task-002',
    title: 'Ellenőrizd a mobilos tördelést',
    description:
      'Nézd át a címsorokat, a vezérlőket és a hosszabb szövegeket keskeny képernyőn is.',
    completed: false,
  },
  {
    id: 'task-003',
    title: 'Írd meg az űrlap hibaüzeneteit',
    description:
      'Minden üzenet mondja el, mi hiányzik, és hogyan lehet javítani. Maradjon meg a már beírt tartalom.',
    completed: false,
  },
  {
    id: 'task-004',
    title: 'Próbáld végig billentyűzettel',
    description:
      'Tab, Shift+Tab, Enter, Space és Escape. A fókusz minden lépésnél legyen látható és követhető.',
    completed: false,
  },
  {
    id: 'task-005',
    title: 'Rögzítsd a projekt célját',
    description:
      'Egy könnyen használható munkatér az apró, követhető feladatokhoz.',
    completed: true,
  },
  {
    id: 'task-006',
    title: 'Gyűjtsd össze az első feladatokat',
    description: 'Hat konkrét lépés, amivel el lehet kezdeni a munkát.',
    completed: true,
  },
];
export const longTask: Task = {
  id: 'task-long',
  title:
    'Ellenőrizd az összes magyar ékezetet, a hosszú feladatcímeket és az egyetlen szóként beillesztett hivatkozásokat keskeny mobilképernyőn is',
  description: (
    'Árvíztűrő tükörfúrógép. A részletek teljes terjedelmükben elolvashatók, és nem takarják el a műveleteket.\n\n' +
    'https://pelda.hu/' +
    'hosszu-hivatkozas'.repeat(12) +
    '\n\n'
  ).repeat(4),
  completed: false,
};
