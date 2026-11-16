/** Development-only state owners. Each renders the application's original component. */
import { useState } from 'react';
import { Button, type ButtonProps } from '../src/components/Button';
import { TextInput, type TextInputProps } from '../src/components/TextInput';
import { Select, type SelectProps } from '../src/components/Select';
import { Checkbox, type CheckboxProps } from '../src/components/Checkbox';
import { TaskCard, type TaskCardProps } from '../src/components/TaskCard';
import { Dialog, type DialogProps } from '../src/components/Dialog';
export function ButtonFixture({ initialProps }: { initialProps: ButtonProps }) {
  const [clicks, setClicks] = useState(0);
  return (
    <>
      <Button {...initialProps} onClick={() => setClicks((n) => n + 1)} />
      <p role="status">Aktiválások: {clicks}</p>
    </>
  );
}
export function TextInputFixture({
  initialProps,
}: {
  initialProps: TextInputProps;
}) {
  const [value, setValue] = useState(initialProps.value);
  return (
    <TextInput
      {...initialProps}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
export function SelectFixture({ initialProps }: { initialProps: SelectProps }) {
  const [value, setValue] = useState(initialProps.value);
  return (
    <Select
      {...initialProps}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
export function CheckboxFixture({
  initialProps,
}: {
  initialProps: CheckboxProps;
}) {
  const [checked, setChecked] = useState(initialProps.checked);
  return (
    <Checkbox
      {...initialProps}
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
}
export function TaskCardFixture({
  initialProps,
}: {
  initialProps: TaskCardProps;
}) {
  const [task, setTask] = useState(initialProps.task);
  return (
    <TaskCard
      {...initialProps}
      task={task}
      onToggle={() => setTask((t) => ({ ...t, completed: !t.completed }))}
    />
  );
}
export function DialogFixture({ initialProps }: { initialProps: DialogProps }) {
  const [open, setOpen] = useState(initialProps.open);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Dialógus megnyitása</Button>
      <Dialog {...initialProps} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
