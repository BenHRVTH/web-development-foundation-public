import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
export interface DialogProps {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}
/** Native showModal provides focus containment and an inert background. */
export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const help = useId();
  useEffect(() => {
    const element = ref.current;
    if (!open || !element) return;
    const previous = document.activeElement;
    element.showModal();
    element
      .querySelector<HTMLElement>(
        'input:not(:disabled), textarea:not(:disabled)',
      )
      ?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={heading}
      aria-describedby={help}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
          ),
        ].filter((element) => element.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open && (
        <div className="dialog__body">
          <div className="dialog__heading">
            <div>
              <p className="eyebrow">EGY KÖVETKEZŐ LÉPÉS</p>
              <h2 id={heading}>{title}</h2>
            </div>
            <Button variant="quiet" icon={<X />} onClick={onClose}>
              Bezárás
            </Button>
          </div>
          <p id={help} className="muted">
            {description}
          </p>
          {children}
        </div>
      )}
    </dialog>
  );
}
