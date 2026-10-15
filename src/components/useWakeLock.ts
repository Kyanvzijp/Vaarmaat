import { useEffect, useRef } from 'react';

/**
 * Houdt het scherm aan zolang `active` waar is (Screen Wake Lock, styleguide 8). De browser laat het slot los
 * als de pagina onzichtbaar wordt; daarom vragen we het opnieuw zodra je terugkomt. `onUnavailable` wordt
 * aangeroepen als de browser het niet kan of weigert.
 */
export function useWakeLock(active: boolean, onUnavailable: () => void) {
  const fallback = useRef(onUnavailable);
  useEffect(() => {
    fallback.current = onUnavailable;
  });
  useEffect(() => {
    if (!active) return;
    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;
    const request = async () => {
      if (!('wakeLock' in navigator)) {
        fallback.current();
        return;
      }
      try {
        const s = await navigator.wakeLock.request('screen');
        if (stopped) s.release().catch(() => undefined);
        else sentinel = s;
      } catch {
        fallback.current();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) request();
    };
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
