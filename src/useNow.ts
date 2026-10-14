import { useEffect, useState } from 'react';

/**
 * De huidige tijd (ms), die elke `intervalMs` opnieuw rendert. Voor klokken in de UI, zoals de aankomsttijd,
 * zodat componenten niet tijdens het renderen `Date.now()` aanroepen. Alleen voor de webapp: de app in mobile/
 * heeft een eigen kopie, omdat gedeelde code die React importeert daar een tweede React zou laden.
 */
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
