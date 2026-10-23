import { useEffect, useState } from 'react';

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** milliseconds until the target; negative once it has passed */
  totalMs: number;
}

function compute(target: number): Remaining {
  const totalMs = target - Date.now();
  const clamped = Math.max(0, totalMs);
  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped / 3_600_000) % 24),
    minutes: Math.floor((clamped / 60_000) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
    totalMs,
  };
}

/** Ticks once per second, aligned to the wall clock. */
export function useCountdown(targetIso: string): Remaining {
  const target = new Date(targetIso).getTime();
  const [remaining, setRemaining] = useState(() => compute(target));

  useEffect(() => {
    let timer: number;
    const tick = () => {
      const next = compute(target);
      setRemaining(next);
      if (next.totalMs > 0) timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 10);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [target]);

  return remaining;
}
