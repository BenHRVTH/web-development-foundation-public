export interface ComparisonProps {
  referenceShown: boolean;
  referenceValid: boolean;
  onCompare: (value: 'A' | 'B') => void;
}
export function ComparisonControl({
  referenceShown,
  referenceValid,
  onCompare,
}: ComparisonProps) {
  return (
    <div
      className="comparison-control"
      role="group"
      aria-label="A/B designkonfiguráció"
    >
      <button
        type="button"
        aria-pressed={referenceShown}
        disabled={!referenceValid}
        onClick={() => onCompare('A')}
      >
        A · Referencia
      </button>
      <button
        type="button"
        aria-pressed={!referenceShown}
        onClick={() => onCompare('B')}
      >
        B · Draft
      </button>
    </div>
  );
}
