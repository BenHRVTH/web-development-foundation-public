import { useWeightOptions } from './Typography';
import { useEffect, useId, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { type EditableTokenConfig, type TokenValue } from '@wdf/core';
import { referenceOptions, tokenLabel } from './editor';

export interface TokenFieldProps {
  id: string;
  config: EditableTokenConfig;
  responsive?: string;
  onEdit: (
    id: string,
    value: TokenValue,
    responsive?: string,
    gestureId?: string,
  ) => string;
  validationError?: string;
}
export function TokenField({
  id,
  config,
  responsive,
  onEdit,
  validationError = '',
}: TokenFieldProps) {
  const token = config.tokens[id]!;
  const weights = useWeightOptions(config, id);
  const weightField = token.type === 'fontWeight';
  const value = responsive
    ? config.responsive?.[responsive]?.overrides[id]
    : token.value;
  const isReference =
    typeof value === 'object' && value !== null && 'ref' in value;
  const initial = isReference
    ? String(value.ref)
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value ?? '');
  const [text, setText] = useState(initial);
  const [reference, setReference] = useState(isReference);
  const [error, setError] = useState('');
  const fieldId = useId();
  const container = useRef<HTMLDivElement>(null);
  const gesture = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!container.current?.contains(document.activeElement)) {
      setText(initial);
      setReference(isReference);
      setError('');
    }
  }, [initial, isReference]);
  const weightUnsupported =
    weightField &&
    ['PASS', 'FAIL'].includes(weights.status) &&
    (reference
      ? !weights.referenceAllowed(text)
      : !weights.verified.includes(Number(text)));
  const options = referenceOptions(config, token.type, id);
  const numeric = !['color', 'fontFamily'].includes(token.type);
  function edit(raw: string, ref = reference) {
    setText(raw);
    const next: TokenValue = ref ? { ref: raw } : numeric ? Number(raw) : raw;
    setError(
      numeric && !ref && raw.trim() === ''
        ? 'Adj meg egy számértéket.'
        : onEdit(id, next, responsive, gesture.current),
    );
  }
  const help =
    token.type === 'spacing'
      ? 'Foundation-skála, referencia px'
      : token.type === 'dimension'
        ? 'Referencia px'
        : token.type === 'duration'
          ? 'Milliszekundum'
          : token.type === 'fontFamily'
            ? 'Betűcsaládok és fallback; a helyben elérhető fontokkal.'
            : token.type === 'color'
              ? 'Hex szín; alfa is megadható.'
              : token.type === 'fontWeight'
                ? '1–1000; a tényleges font támogatásától függ.'
                : 'Egység nélküli érték';
  return (
    <div
      className="token-field"
      data-token={id}
      ref={container}
      onFocusCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          gesture.current = crypto.randomUUID();
      }}
    >
      <div className="field-heading">
        <label htmlFor={fieldId}>{tokenLabel(id)}</label>
        <select
          aria-label={`${id} érték módja`}
          value={reference ? 'reference' : 'value'}
          onChange={(e) => {
            const ref = e.target.value === 'reference';
            setReference(ref);
            if (ref) {
              const target = options.find(
                (o) => !weightField || weights.referenceAllowed(o),
              );
              if (target) edit(target, true);
              else
                setError(
                  'Nincs igazolt súlyreferencia; a jelenlegi érték megmaradt.',
                );
            } else {
              setText('');
              setError('Adj meg egy közvetlen értéket.');
            }
          }}
        >
          <option value="value">Érték</option>
          <option value="reference">Hivatkozás</option>
        </select>
      </div>
      <div className="field-control">
        {reference ? (
          <>
            <Link2 size={16} aria-hidden="true" />
            <select
              id={fieldId}
              value={text}
              title={text}
              aria-invalid={!!(error || validationError) || weightUnsupported}
              aria-describedby={`${fieldId}-help`}
              onChange={(e) => edit(e.target.value)}
            >
              {!options.includes(text) && <option value={text}>{text}</option>}
              {options.map((option) => (
                <option
                  key={option}
                  value={option}
                  disabled={weightField && !weights.referenceAllowed(option)}
                >
                  {option}
                </option>
              ))}
            </select>
          </>
        ) : weightField ? (
          <select
            id={fieldId}
            value={text}
            aria-describedby={`${fieldId}-help`}
            aria-invalid={!!(error || validationError) || weightUnsupported}
            onChange={(e) => {
              if (weights.verified.includes(Number(e.target.value)))
                edit(e.target.value);
            }}
          >
            {!weights.candidates.includes(Number(text)) && (
              <option value={text} disabled>
                {text} · megőrzött, nem igazolt érték
              </option>
            )}
            {weights.candidates.map((w) => (
              <option
                key={w}
                value={w}
                disabled={!weights.verified.includes(w)}
              >
                {w} ·{' '}
                {weights.verified.includes(w)
                  ? 'igazolt képviselő'
                  : weights.status === 'FAIL' || weights.status === 'PASS'
                    ? 'nem igazolt / összeolvadó'
                    : weights.status}
              </option>
            ))}
          </select>
        ) : (
          <>
            {token.type === 'color' && (
              <input
                type="color"
                aria-label={`${id} színválasztó`}
                value={/^#[\da-f]{6}$/i.test(text) ? text : '#000000'}
                onChange={(e) => edit(e.target.value)}
              />
            )}
            <input
              id={fieldId}
              type={numeric ? 'number' : 'text'}
              step="any"
              value={text}
              title={text}
              aria-invalid={!!(error || validationError)}
              aria-describedby={`${fieldId}-help`}
              spellCheck={false}
              onChange={(e) => {
                setText(e.target.value);
                if (!(
                  'isComposing' in e.nativeEvent && e.nativeEvent.isComposing
                ))
                  edit(e.target.value);
              }}
              onCompositionEnd={(e) => edit(e.currentTarget.value)}
            />
          </>
        )}
      </div>
      <p
        id={`${fieldId}-help`}
        className={
          error || validationError || weightUnsupported
            ? 'field-error'
            : 'field-help'
        }
      >
        {error || validationError || (weightField ? weights.help : help)}
      </p>
      <code>
        {id}
        {reference && (
          <span className="reference-target">Hivatkozás: {text}</span>
        )}
      </code>
    </div>
  );
}
