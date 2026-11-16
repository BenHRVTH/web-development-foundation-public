import { expect, test } from 'vitest';
import {
  filterTasks,
  initialTasks,
  validateTask,
  TITLE_LIMIT,
  DESCRIPTION_LIMIT,
} from './model';
test('M2-F01: deterministic data, unique IDs, filtering and immutable source', () => {
  expect(initialTasks).toHaveLength(6);
  expect(new Set(initialTasks.map((task) => task.id)).size).toBe(6);
  expect(filterTasks(initialTasks, 'all')).toHaveLength(6);
  expect(filterTasks(initialTasks, 'open')).toHaveLength(4);
  expect(filterTasks(initialTasks, 'completed')).toHaveLength(2);
  expect(filterTasks([], 'open')).toEqual([]);
});
test('M2-F02: required trimmed title, length boundaries and optional description', () => {
  expect(
    validateTask({ title: '  ', description: '', completed: false }).title,
  ).toBe('Adj nevet a feladatnak.');
  expect(
    validateTask({
      title: 'a'.repeat(TITLE_LIMIT),
      description: 'b'.repeat(DESCRIPTION_LIMIT),
      completed: false,
    }),
  ).toEqual({ title: '', description: '' });
  const errors = validateTask({
    title: 'a'.repeat(TITLE_LIMIT + 1),
    description: 'b'.repeat(DESCRIPTION_LIMIT + 1),
    completed: false,
  });
  expect(errors.title).toContain('160');
  expect(errors.description).toContain('4000');
});
