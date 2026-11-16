import { useId, type ChangeEventHandler } from 'react';
export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean | undefined;
  labelHidden?: boolean | undefined;
}
export function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  labelHidden = false,
}: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`checkbox${disabled ? ' checkbox--disabled' : ''}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className={labelHidden ? 'sr-only' : ''}>{label}</span>
    </label>
  );
}
