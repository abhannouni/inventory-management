import { useEffect, useState } from 'react';

/**
 * Animates from 0 up to `target`. A new `target` of 0 is not special-cased —
 * the eased value is `ease * target`, which is already 0 on every frame, so
 * it animates down to 0 exactly like any other value instead of needing a
 * synchronous reset inside the effect.
 */
export function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start: number;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setCount(Math.round(ease * target));
      if (prog < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return count;
}
