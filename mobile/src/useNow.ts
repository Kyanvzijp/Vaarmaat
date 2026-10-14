import { useEffect, useState } from 'react';

/**
 * De huidige tijd (ms), die elke `intervalMs` opnieuw rendert, zodat componenten niet tijdens het renderen
 * `Date.now()` aanroepen. Eigen kopie van ../../src/useNow.ts: gedeelde code in ../src importeert geen React,
 * anders laadt Metro React uit de node_modules van de webapp en zijn er twee kopieën.
 */
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
