import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
export interface ActionProps {
  children: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  busy?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}
export function Action({
  children,
  variant = 'primary',
  disabled = false,
  busy = false,
  onClick,
  type = 'button',
}: ActionProps) {
  return (
    <button
      type={type}
      className={`action action-${variant}`}
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={onClick}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </svg>
      <span>{children}</span>
    </button>
  );
}
export interface SessionProps {
  title: string;
  time: string;
  description: string;
  variant?: 'compact' | 'comfortable' | 'spacious';
  unavailable?: boolean;
  onReserve?: () => void;
}
export function SessionCard({
  title,
  time,
  description,
  variant = 'comfortable',
  unavailable = false,
  onReserve,
}: SessionProps) {
  return (
    <article className={`session session-${variant}`}>
      <p className="session-time">{time}</p>
      <div>
        <h2>{title}</h2>
        <p>{description || 'A program részleteit hamarosan közzétesszük.'}</p>
        <Action disabled={unavailable} onClick={onReserve}>
          {unavailable ? 'Minden hely elkelt' : 'Helyet kérek'}
        </Action>
      </div>
    </article>
  );
}
export interface FieldProps {
  label: string;
  value?: string;
  error?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}
export function Field({
  label,
  value = '',
  error,
  disabled,
  onChange,
}: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? id + '-error' : undefined}
      />
      {error && (
        <p id={id + '-error'} className="error">
          {error}
        </p>
      )}
    </div>
  );
}
export interface ReservationProps {
  title: string;
  onClose?: () => void;
  onReserved?: (name: string) => void;
  initialError?: boolean;
}
export function Reservation({
  title,
  onClose,
  onReserved,
  initialError = false,
}: ReservationProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(
    initialError ? 'Írd be a neved a foglaláshoz.' : '',
  );
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      ref.current?.close();
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),a[href],select:not(:disabled),textarea:not(:disabled)',
          ),
        ].filter((e) => e.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
    >
      <div className="reservation">
        <h2 id={id}>Helyfoglalás</h2>
        <p>{title}</p>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              setError('Írd be a neved a foglaláshoz.');
              ref.current?.querySelector('input')?.focus();
              return;
            }
            onReserved?.(name.trim());
          }}
        >
          <Field
            label="Neved"
            value={name}
            error={error}
            onChange={(v) => {
              setName(v);
              setError('');
            }}
          />
          <div className="form-actions">
            <Action type="submit">Foglalás megerősítése</Action>
            <Action variant="secondary" onClick={onClose}>
              Mégse
            </Action>
          </div>
        </form>
      </div>
    </dialog>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="notice" role="status">
      {children}
    </p>
  );
}
