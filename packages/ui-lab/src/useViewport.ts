import { useLayoutEffect, useRef, useState } from 'react';

/** Measure the content box after padding and the actual reserved scrollbar gutter. */
export function useViewport(widths: readonly number[]) {
  const canvas = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const minimum = Math.min(...widths);
  const [width, setWidth] = useState(minimum);
  const [available, setAvailable] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      const space = Math.max(
        0,
        element.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
      );
      setAvailable(space);
      if (!initialized.current) {
        initialized.current = true;
        setWidth(
          Math.max(
            minimum,
            ...widths.filter((candidate) => candidate <= space),
          ),
        );
      }
    };
    measure();
    // Later layout changes update the space warning, never the selected viewport.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minimum, widths]);

  return {
    canvas,
    width,
    setWidth,
    minimum,
    belowMinimum: available !== null && available < minimum,
  };
}
