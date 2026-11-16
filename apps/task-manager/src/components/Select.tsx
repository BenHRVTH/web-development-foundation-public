import { useId, type ChangeEventHandler } from 'react';
export interface SelectProps {
  label: string;
  value: string;
  options: readonly {
    value: string;
    label: string;
    disabled?: boolean | undefined;
  }[];
  onChange: ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean | undefined;
}
/** The popup deliberately uses the browser/OS keyboard and geometry contract. */
export function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SelectProps) {
  const id = useId();
  return (
    <div className="select-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="select"
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
