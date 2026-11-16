import {
  ButtonFixture,
  TextInputFixture,
  SelectFixture,
  CheckboxFixture,
  TaskCardFixture,
  DialogFixture,
} from './fixture-owners';
import { createElement, isValidElement, type ReactNode } from 'react';
import { z } from 'zod';
import { defineComponent } from '@wdf/adapter-react';
import { Button, type ButtonProps } from '../src/components/Button';
import { TextInput, type TextInputProps } from '../src/components/TextInput';
import { Select, type SelectProps } from '../src/components/Select';
import { Checkbox, type CheckboxProps } from '../src/components/Checkbox';
import { TaskCard, type TaskCardProps } from '../src/components/TaskCard';
import { Dialog, type DialogProps } from '../src/components/Dialog';
import { StatusBadge } from '../src/components/StatusBadge';
import { initialTasks, longTask } from '../src/tasks/model';
import { Plus } from 'lucide-react';
import type { TokenId } from '../src/generated/tokens';

const noop = () => {};
const node = z.custom<ReactNode>(
  (value) =>
    value == null ||
    ['string', 'number', 'boolean'].includes(typeof value) ||
    isValidElement(value),
);
const callback = <T>() => z.custom<T>((value) => typeof value === 'function');
const tokens = (family: TokenId[], variants: Record<string, TokenId[]>) => ({
  family,
  variants,
});
const baseTask = initialTasks[0]!;
export const buttonRegistration = defineComponent({
  id: 'button',
  name: 'Button',
  category: 'Primitive',
  family: 'button',
  component: Button,
  fixtureOwner: ButtonFixture,
  propsSchema: z.strictObject({
    children: z.string().trim().min(1),
    variant: z.enum(['primary', 'secondary', 'quiet']).optional(),
    disabled: z.boolean().optional(),
    busy: z.boolean().optional(),
    icon: node.optional(),
    type: z.enum(['button', 'submit']).optional(),
    onClick: callback<ButtonProps['onClick']>().optional(),
    ref: z.custom<ButtonProps['ref']>().optional(),
  }),
  variants: ['primary', 'secondary', 'quiet'],
  states: ['default', 'disabled', 'busy', 'long'],
  tokens: tokens(['component.button.radius'], {
    primary: ['component.button.primary.background'],
    secondary: ['component.button.secondary.background'],
    quiet: ['component.button.quiet.background'],
  }),
  fixtures: [
    {
      id: 'primary',
      name: 'Új feladat',
      variant: 'primary',
      state: 'default',
      props: {
        children: 'Új feladat',
        icon: createElement(Plus),
        onClick: noop,
      },
    },
    {
      id: 'secondary',
      name: 'Mégse',
      variant: 'secondary',
      state: 'default',
      props: { children: 'Mégse', variant: 'secondary', onClick: noop },
    },
    {
      id: 'quiet',
      name: 'Bezárás',
      variant: 'quiet',
      state: 'default',
      props: { children: 'Bezárás', variant: 'quiet', onClick: noop },
    },
    {
      id: 'disabled',
      name: 'Letiltva',
      variant: 'primary',
      state: 'disabled',
      props: { children: 'Mentés', disabled: true, onClick: noop },
    },
    {
      id: 'busy',
      name: 'Folyamatban',
      variant: 'primary',
      state: 'busy',
      props: { children: 'Mentés', busy: true },
    },
    {
      id: 'long',
      name: 'Hosszú gombfelirat',
      variant: 'primary',
      state: 'long',
      props: {
        children: 'A feladat módosításainak mentése',
        icon: createElement(Plus),
        onClick: noop,
      },
    },
  ],
});
export const textInputRegistration = defineComponent({
  id: 'text-input',
  name: 'TextInput',
  category: 'Primitive',
  family: 'text-input',
  component: TextInput,
  fixtureOwner: TextInputFixture,
  propsSchema: z.strictObject({
    label: z.string().min(1),
    value: z.string(),
    onChange: callback<TextInputProps['onChange']>(),
    multiline: z.boolean().optional(),
    error: z.string().optional(),
    hint: z.string().optional(),
    required: z.boolean().optional(),
    disabled: z.boolean().optional(),
    maxLength: z.number().int().positive().optional(),
    inputRef: z.custom<TextInputProps['inputRef']>().optional(),
  }),
  variants: ['single', 'multiline'],
  states: ['default', 'error', 'disabled', 'long'],
  tokens: tokens(['component.text-input.radius'], {
    single: ['component.text-input.single.background'],
    multiline: ['component.text-input.multiline.background'],
  }),
  fixtures: [
    {
      id: 'single',
      name: 'Cím',
      variant: 'single',
      state: 'default',
      props: { label: 'Feladat neve', value: baseTask.title, onChange: noop },
    },
    {
      id: 'multiline',
      name: 'Leírás',
      variant: 'multiline',
      state: 'default',
      props: {
        label: 'Leírás',
        value: baseTask.description,
        multiline: true,
        onChange: noop,
      },
    },
    {
      id: 'error',
      name: 'Hiányzó cím',
      variant: 'single',
      state: 'error',
      props: {
        label: 'Feladat neve',
        value: '',
        required: true,
        error: 'Adj nevet a feladatnak.',
        onChange: noop,
      },
    },
    {
      id: 'disabled',
      name: 'Letiltva',
      variant: 'single',
      state: 'disabled',
      props: {
        label: 'Feladat neve',
        value: baseTask.title,
        disabled: true,
        onChange: noop,
      },
    },
    {
      id: 'long',
      name: 'Hosszú leírás',
      variant: 'multiline',
      state: 'long',
      props: {
        label: 'Leírás',
        value: longTask.description,
        multiline: true,
        onChange: noop,
      },
    },
  ],
});
export const selectRegistration = defineComponent({
  id: 'select',
  name: 'Select',
  category: 'Primitive',
  family: 'select',
  component: Select,
  fixtureOwner: SelectFixture,
  propsSchema: z.strictObject({
    label: z.string().min(1),
    value: z.string(),
    options: z
      .array(
        z.strictObject({
          value: z.string(),
          label: z.string(),
          disabled: z.boolean().optional(),
        }),
      )
      .min(1),
    onChange: callback<SelectProps['onChange']>(),
    disabled: z.boolean().optional(),
  }),
  variants: ['native'],
  states: ['default', 'disabled', 'long'],
  tokens: tokens(['component.select.radius'], {
    native: ['component.select.native.background'],
  }),
  fixtures: [
    {
      id: 'default',
      name: 'Állapotszűrő',
      variant: 'native',
      state: 'default',
      props: {
        label: 'Állapot',
        value: 'all',
        options: [
          { value: 'all', label: 'Minden feladat' },
          { value: 'open', label: 'Nyitott' },
          { value: 'completed', label: 'Kész' },
        ],
        onChange: noop,
      },
    },
    {
      id: 'disabled',
      name: 'Letiltva',
      variant: 'native',
      state: 'disabled',
      props: {
        label: 'Állapot',
        value: 'all',
        options: [{ value: 'all', label: 'Minden feladat' }],
        disabled: true,
        onChange: noop,
      },
    },
    {
      id: 'long',
      name: 'Hosszú opció',
      variant: 'native',
      state: 'long',
      props: {
        label: 'Állapot',
        value: 'all',
        options: [
          {
            value: 'all',
            label: 'Minden megjeleníthető és módosítható feladat',
          },
        ],
        onChange: noop,
      },
    },
  ],
});
export const checkboxRegistration = defineComponent({
  id: 'checkbox',
  name: 'Checkbox',
  category: 'Primitive',
  family: 'checkbox',
  component: Checkbox,
  fixtureOwner: CheckboxFixture,
  propsSchema: z.strictObject({
    label: z.string().min(1),
    checked: z.boolean(),
    onChange: callback<CheckboxProps['onChange']>(),
    disabled: z.boolean().optional(),
    labelHidden: z.boolean().optional(),
  }),
  variants: ['default'],
  states: ['unchecked', 'checked', 'disabled'],
  tokens: tokens(['component.checkbox.radius'], {
    default: ['component.checkbox.default.accent'],
  }),
  fixtures: [
    {
      id: 'unchecked',
      name: 'Nyitott',
      variant: 'default',
      state: 'unchecked',
      props: { label: 'Teljesítés', checked: false, onChange: noop },
    },
    {
      id: 'checked',
      name: 'Kész',
      variant: 'default',
      state: 'checked',
      props: { label: 'Teljesítés', checked: true, onChange: noop },
    },
    {
      id: 'disabled',
      name: 'Letiltva',
      variant: 'default',
      state: 'disabled',
      props: {
        label: 'Teljesítés',
        checked: false,
        disabled: true,
        onChange: noop,
      },
    },
  ],
});
export const taskCardRegistration = defineComponent({
  id: 'task-card',
  name: 'TaskCard',
  category: 'Composite',
  family: 'task-card',
  component: TaskCard,
  fixtureOwner: TaskCardFixture,
  propsSchema: z.strictObject({
    task: z.strictObject({
      id: z.string().regex(/^task-[a-z0-9-]+$/),
      title: z.string().trim().min(1).max(160),
      description: z.string().max(4000),
      completed: z.boolean(),
    }),
    density: z.enum(['compact', 'comfortable', 'spacious']).optional(),
    onToggle: callback<TaskCardProps['onToggle']>(),
    href: z.string().regex(/^#tasks\/[a-z0-9-]+$/),
  }),
  variants: ['compact', 'comfortable', 'spacious'],
  states: ['open', 'completed', 'long'],
  tokens: tokens(
    ['component.task-card.radius', 'component.task-card.background'],
    {
      compact: ['component.task-card.compact.padding'],
      comfortable: ['component.task-card.comfortable.padding'],
      spacious: ['component.task-card.spacious.padding'],
    },
  ),
  fixtures: [
    ...(['compact', 'comfortable', 'spacious'] as const).map((density) => ({
      id: density,
      name: density,
      variant: density,
      state: 'open',
      props: {
        task: baseTask,
        density,
        onToggle: noop,
        href: '#tasks/task-001',
      },
    })),
    {
      id: 'completed',
      name: 'Elkészült feladat',
      variant: 'comfortable',
      state: 'completed',
      props: {
        task: initialTasks[4]!,
        onToggle: noop,
        href: '#tasks/task-005',
      },
    },
    {
      id: 'long',
      name: 'Hosszú tartalom',
      variant: 'spacious',
      state: 'long',
      props: {
        task: longTask,
        density: 'spacious',
        onToggle: noop,
        href: '#tasks/task-long',
      },
    },
  ],
});
export const dialogRegistration = defineComponent({
  id: 'dialog',
  name: 'Dialog',
  category: 'Composite',
  family: 'dialog',
  component: Dialog,
  fixtureOwner: DialogFixture,
  propsSchema: z.strictObject({
    open: z.boolean(),
    title: z.string().min(1),
    description: z.string().min(1),
    children: node,
    onClose: callback<DialogProps['onClose']>(),
  }),
  variants: ['modal'],
  states: ['open', 'closed', 'long'],
  tokens: tokens(['component.dialog.radius', 'component.dialog.background'], {
    modal: ['component.dialog.modal.padding'],
  }),
  fixtures: [
    {
      id: 'open',
      name: 'Nyitott dialógus',
      variant: 'modal',
      state: 'open',
      props: {
        open: true,
        title: 'Új feladat',
        description: 'Add meg a következő lépést.',
        children: createElement(Button, { onClick: noop, children: 'Mentés' }),
        onClose: noop,
      },
    },
    {
      id: 'closed',
      name: 'Zárt dialógus',
      variant: 'modal',
      state: 'closed',
      props: {
        open: false,
        title: 'Új feladat',
        description: 'Add meg a következő lépést.',
        children: null,
        onClose: noop,
      },
    },
    {
      id: 'long',
      name: 'Hosszú tartalom',
      variant: 'modal',
      state: 'long',
      props: {
        open: true,
        title: longTask.title,
        description: 'A tartalom görgethető.',
        children: longTask.description,
        onClose: noop,
      },
    },
  ],
});
export const statusBadgeRegistration = defineComponent({
  id: 'status-badge',
  name: 'StatusBadge',
  category: 'Primitive',
  family: 'status-badge',
  component: StatusBadge,
  propsSchema: z.strictObject({ completed: z.boolean() }),
  variants: ['open', 'completed'],
  states: ['default'],
  tokens: tokens(['component.status-badge.radius'], {
    open: ['component.status-badge.open.background'],
    completed: ['component.status-badge.completed.background'],
  }),
  fixtures: [
    {
      id: 'open',
      name: 'Nyitott',
      variant: 'open',
      state: 'default',
      props: { completed: false },
    },
    {
      id: 'completed',
      name: 'Kész',
      variant: 'completed',
      state: 'default',
      props: { completed: true },
    },
  ],
});
export const componentRegistry = [
  buttonRegistration,
  textInputRegistration,
  selectRegistration,
  checkboxRegistration,
  taskCardRegistration,
  dialogRegistration,
  statusBadgeRegistration,
] as const;
