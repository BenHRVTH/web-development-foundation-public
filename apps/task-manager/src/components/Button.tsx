import type { MouseEventHandler, ReactNode, Ref } from 'react';
export interface ButtonProps {
  children: string;
  variant?: 'primary' | 'secondary' | 'quiet' | undefined;
  disabled?: boolean | undefined;
  busy?: boolean | undefined;
  icon?: ReactNode;
  type?: 'button' | 'submit' | undefined;
  onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
  ref?: Ref<HTMLButtonElement> | undefined;
}
export function Button({
  children,
  variant = 'primary',
  disabled = false,
  busy = false,
  icon,
  type = 'button',
  onClick,
  ref,
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={`button button--${variant}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {icon && (
        <span className="button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
      {busy && <span className="button__busy" aria-hidden="true" />}
    </button>
  );
}
