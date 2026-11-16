import { useId, type ChangeEventHandler, type Ref } from 'react';
export interface TextInputProps {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  multiline?: boolean | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  maxLength?: number | undefined;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement> | undefined;
}
export function TextInput({
  label,
  value,
  onChange,
  multiline = false,
  error,
  hint,
  required = false,
  disabled = false,
  maxLength,
  inputRef,
}: TextInputProps) {
  const id = useId();
  const props = {
    id,
    value,
    onChange,
    disabled,
    required,
    maxLength,
    'aria-invalid': !!error,
    'aria-describedby': `${id}-help`,
    ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (typeof inputRef === 'function') return inputRef(element);
      if (inputRef) inputRef.current = element;
    },
  };
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="field__required"> · kötelező</span>}
      </label>
      {multiline ? (
        <textarea {...props} className="text-input resize-none" rows={6} />
      ) : (
        <input {...props} type="text" className="text-input" />
      )}
      <p
        id={`${id}-help`}
        className={`field__help${error ? ' field__help--error' : ''}`}
        aria-live="polite"
      >
        {error || hint || '\u00a0'}
      </p>
    </div>
  );
}
