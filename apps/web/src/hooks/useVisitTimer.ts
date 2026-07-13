import { useEffect, useState } from 'react';
import type { Visit } from '../types';

/**
 * Live elapsed-seconds counter for a visit.
 *
 * The value is never accumulated from ticks and never read off the device's wall
 * clock. Each tick recomputes it as:
 *
 *     server elapsed_seconds  +  monotonic time since that payload arrived
 *
 * which means:
 *  - a refresh, a new device, or a re-login resumes at the right number, because
 *    the baseline comes from the server's own `checkin_at`;
 *  - a wrong or tampered device clock cannot distort the display;
 *  - a throttled or backgrounded tab catches up the instant it is shown again,
 *    since nothing depends on ticks having actually fired.
 *
 * A completed visit reports its stored duration and stops.
 */
export function useVisitTimer(visit: Visit | null): number {
  const isRunning = !!visit && visit.status === 'open';
  const serverElapsed = visit?.elapsed_seconds ?? 0;

  // For a finished visit the server's stored duration is the final word.
  const frozen = visit && !isRunning ? (visit.duration_seconds ?? serverElapsed) : null;

  // Changes whenever a fresh payload for this visit (or a different visit) arrives.
  const key = `${visit?.id ?? ''}:${serverElapsed}:${visit?.status ?? ''}`;

  const [elapsed, setElapsed] = useState(frozen ?? serverElapsed);
  const [lastKey, setLastKey] = useState(key);

  // Re-seed from the new server baseline. Done during render rather than in an
  // effect so the correct value paints immediately instead of flashing the stale
  // one for a frame. Pure: it only compares strings, it reads no clock.
  if (lastKey !== key) {
    setLastKey(key);
    setElapsed(frozen ?? serverElapsed);
  }

  useEffect(() => {
    if (!isRunning) return;

    // Anchor captured inside the effect: `performance.now()` is monotonic, so it
    // keeps counting correctly even if the system clock is adjusted mid-visit.
    const baselineSeconds = serverElapsed;
    const anchor = performance.now();

    const tick = () =>
      setElapsed(
        Math.max(0, Math.floor(baselineSeconds + (performance.now() - anchor) / 1000)),
      );

    const id = setInterval(tick, 1000);

    // Browsers throttle timers in background tabs; resync as soon as we're visible.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isRunning, serverElapsed, key]);

  return elapsed;
}
