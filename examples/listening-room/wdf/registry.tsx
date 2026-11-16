import { useState, type ComponentProps } from 'react';
import { z } from 'zod';
import { defineComponent } from '@wdf/adapter-react';
import { Action, Field, Reservation, SessionCard } from '../src/components';
const callback = z.custom<() => void>((v) => typeof v === 'function');
const action = defineComponent({
  id: 'action',
  name: 'Művelet',
  category: 'Primitive',
  family: 'action',
  component: Action,
  propsSchema: z.object({
    children: z.string(),
    variant: z.enum(['primary', 'secondary']).optional(),
    disabled: z.boolean().optional(),
    busy: z.boolean().optional(),
    onClick: callback.optional(),
    type: z.enum(['button', 'submit']).optional(),
  }),
  variants: ['primary', 'secondary'],
  states: ['default', 'disabled', 'busy', 'long'],
  tokens: {
    family: ['component.action.radius'],
    variants: {
      primary: ['component.action.primary.background'],
      secondary: ['component.action.secondary.background'],
    },
  },
  fixtures: [
    {
      id: 'primary',
      name: 'Helyfoglalás',
      variant: 'primary',
      state: 'default',
      props: { children: 'Helyet kérek' },
    },
    {
      id: 'secondary',
      name: 'Mégse',
      variant: 'secondary',
      state: 'default',
      props: { children: 'Mégse', variant: 'secondary' },
    },
    {
      id: 'disabled',
      name: 'Betelt',
      variant: 'primary',
      state: 'disabled',
      props: { children: 'Minden hely elkelt', disabled: true },
    },
    {
      id: 'busy',
      name: 'Folyamatban',
      variant: 'primary',
      state: 'busy',
      props: { children: 'Foglalás', busy: true },
    },
    {
      id: 'long',
      name: 'Hosszú felirat',
      variant: 'primary',
      state: 'long',
      props: {
        children: 'A kiválasztott hallgatószobai helyfoglalás megerősítése',
      },
    },
  ],
});
const session = defineComponent({
  id: 'session-card',
  name: 'Programkártya',
  category: 'Composite',
  family: 'session-card',
  component: SessionCard,
  propsSchema: z.object({
    title: z.string(),
    time: z.string(),
    description: z.string(),
    variant: z.enum(['compact', 'comfortable', 'spacious']).optional(),
    unavailable: z.boolean().optional(),
    onReserve: callback.optional(),
  }),
  variants: ['compact', 'comfortable', 'spacious'],
  states: ['default', 'long', 'missing'],
  tokens: {
    family: ['component.session-card.radius'],
    variants: Object.fromEntries(
      ['compact', 'comfortable', 'spacious'].map((v) => [
        v,
        [`component.session-card.${v}.padding`],
      ]),
    ),
  },
  fixtures: [
    ...(['compact', 'comfortable', 'spacious'] as const).map((variant) => ({
      id: variant,
      name: variant,
      variant,
      state: 'default',
      props: {
        title: 'Városi hangutak',
        time: 'PÉNTEK · 19:00',
        description: 'Közös figyelem a város halkabb történeteire.',
        variant,
      },
    })),
    {
      id: 'long',
      name: 'Hosszú magyar szöveg',
      variant: 'spacious',
      state: 'long',
      props: {
        title:
          'Árvíztűrő tükörfúrógép és a hallgatószoba hosszú történetei '.repeat(
            6,
          ),
        time: 'SZOMBAT · 10:00',
        description: 'Őrzött hangok, közös történetek. '.repeat(12),
        variant: 'spacious',
      },
    },
    {
      id: 'missing',
      name: 'Hiányzó leírás',
      variant: 'comfortable',
      state: 'missing',
      props: {
        title: 'Nyitott hallgatószoba',
        time: 'CSÜTÖRTÖK · 18:00',
        description: '',
      },
    },
  ],
});
function FieldFixture({
  initialProps,
}: {
  initialProps: ComponentProps<typeof Field>;
}) {
  const [value, setValue] = useState(initialProps.value ?? '');
  return <Field {...initialProps} value={value} onChange={setValue} />;
}
const field = defineComponent({
  id: 'field',
  name: 'Névmező',
  category: 'Primitive',
  family: 'field',
  component: Field,
  fixtureOwner: FieldFixture,
  propsSchema: z.object({
    label: z.string(),
    value: z.string().optional(),
    error: z.string().optional(),
    disabled: z.boolean().optional(),
    onChange: z
      .custom<(v: string) => void>((v) => typeof v === 'function')
      .optional(),
  }),
  variants: ['default'],
  states: ['default', 'error', 'disabled'],
  tokens: {
    family: ['component.field.radius'],
    variants: { default: ['component.field.default.border'] },
  },
  fixtures: [
    {
      id: 'normal',
      name: 'Név',
      variant: 'default',
      state: 'default',
      props: { label: 'Neved' },
    },
    {
      id: 'error',
      name: 'Hibás bemenet',
      variant: 'default',
      state: 'error',
      props: { label: 'Neved', error: 'Írd be a neved a foglaláshoz.' },
    },
    {
      id: 'disabled',
      name: 'Tiltott',
      variant: 'default',
      state: 'disabled',
      props: { label: 'Neved', disabled: true },
    },
  ],
});
function ReservationFixture({
  initialProps,
}: {
  initialProps: ComponentProps<typeof Reservation>;
}) {
  const [open, setOpen] = useState(true);
  return open ? (
    <Reservation
      {...initialProps}
      onClose={() => setOpen(false)}
      onReserved={() => setOpen(false)}
    />
  ) : (
    <Action onClick={() => setOpen(true)}>Helyfoglalás megnyitása</Action>
  );
}
const reservation = defineComponent({
  id: 'reservation',
  name: 'Helyfoglalás',
  category: 'Composite',
  family: 'reservation',
  component: Reservation,
  fixtureOwner: ReservationFixture,
  propsSchema: z.object({
    title: z.string(),
    initialError: z.boolean().optional(),
    onClose: callback.optional(),
    onReserved: z
      .custom<(v: string) => void>((v) => typeof v === 'function')
      .optional(),
  }),
  variants: ['default'],
  states: ['default', 'error'],
  tokens: {
    family: ['component.reservation.radius'],
    variants: { default: ['component.reservation.default.background'] },
  },
  fixtures: [
    {
      id: 'normal',
      name: 'Helyfoglalás',
      variant: 'default',
      state: 'default',
      props: { title: 'Nyitott hallgatószoba' },
    },
    {
      id: 'error',
      name: 'Hibás helyfoglalás',
      variant: 'default',
      state: 'error',
      props: { title: 'Nyitott hallgatószoba', initialError: true },
    },
  ],
});
export const componentRegistry = [action, session, field, reservation];
