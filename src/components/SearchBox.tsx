import { useEffect, useRef, useState } from 'react';
import { geocode, searchLocal, REMOTE_DELAY, type Place } from '../geocode';

interface Props {
  label: string;
  value: Place | null;
  placeholder: string;
  onSelect: (p: Place | null) => void;
  onUseGps?: () => void;
  onPickOnMap?: () => void;
  picking?: boolean;
}

const icon = (k: Place['kind']) => (k === 'waterway' ? '〰️' : k === 'harbour' ? '⚓' : k === 'gps' ? '📍' : '📌');

export default function SearchBox({ label, value, placeholder, onSelect, onUseGps, onPickOnMap, picking }: Props) {
  const [text, setText] = useState(value?.name ?? '');
  // tekst volgt de gekozen plek als die van buitenaf verandert (omkeren, tocht openen, Mijn locatie)
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(value?.name ?? '');
  }
  // naam voor schermlezers: "Vertrekpunt", "Bestemming" of "Tussenpunt 2" in plaats van de letter
  const a11yName = `${placeholder.replace(/\s*\(.*\)$/, '')}${/^\d+$/.test(label) ? ` ${label}` : ''}`;
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (blurRef.current) clearTimeout(blurRef.current);
    abortRef.current?.abort();
  };
  useEffect(() => cancel, []);

  /** Bekende bestemmingen meteen; adressen pas als je even stopt met typen (gebruiksbeleid Nominatim) */
  const search = (q: string, delay: number) => {
    cancel();
    setResults(searchLocal(q));
    if (q.trim().length < 3) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const r = await geocode(q, ac.signal);
      if (!ac.signal.aborted) {
        setResults(r);
        setLoading(false);
      }
    }, delay);
  };

  const choose = (p: Place) => {
    cancel();
    setLoading(false);
    onSelect(p);
    setOpen(false);
  };

  return (
    <div className={`search ${picking ? 'picking' : ''}`}>
      <span className="search-label" aria-hidden="true">{label}</span>
      <input
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value) {
            // zelf typen wist de gekozen plek, maar niet wat je net typte
            setShown(null);
            onSelect(null);
          }
          search(e.target.value, REMOTE_DELAY);
        }}
        onFocus={() => {
          // een blur van eerder (bijvoorbeeld van het veld dat hier stond voor je een tussenpunt toevoegde) mag de lijst niet sluiten
          if (blurRef.current) clearTimeout(blurRef.current);
          setOpen(true);
        }}
        onBlur={() => {
          blurRef.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (results[0]) choose(results[0]);
            else if (text.trim().length >= 3) search(text, 0);
          } else if (e.key === 'Escape') setOpen(false);
        }}
        aria-label={a11yName}
      />
      {text && (
        <button className="icon-btn" title="Wissen" aria-label="Zoekveld wissen" onClick={() => { cancel(); setText(''); setResults([]); setLoading(false); onSelect(null); }}>
          ×
        </button>
      )}
      {open && (text.trim().length > 0 || onUseGps) && (
        <ul className="search-results">
          {onUseGps && text.trim().length === 0 && (
            <li onMouseDown={() => { onUseGps(); setOpen(false); }}>📍 <b>Mijn locatie</b> <small>huidige GPS positie</small></li>
          )}
          {onPickOnMap && text.trim().length === 0 && (
            <li onMouseDown={() => { onPickOnMap(); setOpen(false); }}>🗺️ <b>Kies op de kaart</b> <small>tik op een vaarweg</small></li>
          )}
          {results.map((r, i) => (
            <li key={`${r.name}:${i}`} onMouseDown={() => choose(r)}>
              {icon(r.kind)} <b>{r.name}</b> <small>{r.detail}</small>
            </li>
          ))}
          {loading && <li className="muted">Adressen zoeken…</li>}
          {!loading && text.trim().length >= 3 && results.length === 0 && <li className="muted">Niets gevonden. Tik op de kaart om een punt te kiezen.</li>}
        </ul>
      )}
    </div>
  );
}
