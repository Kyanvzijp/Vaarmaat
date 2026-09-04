import { useEffect, useRef, useState } from 'react';
import { geocode, type Place } from '../geocode';

interface Props {
  label: string;
  value: Place | null;
  placeholder: string;
  onSelect: (p: Place | null) => void;
  onUseGps?: () => void;
  onPickOnMap?: () => void;
  picking?: boolean;
}

export default function SearchBox({ label, value, placeholder, onSelect, onUseGps, onPickOnMap, picking }: Props) {
  const [text, setText] = useState(value?.name ?? '');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setText(value?.name ?? '');
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const q = text.trim();
    if (q.length === 0) {
      setResults([]);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await geocode(q, ac.signal);
      if (!ac.signal.aborted) {
        setResults(r);
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [text, open]);

  const icon = (k: Place['kind']) => (k === 'waterway' ? '〰️' : k === 'harbour' ? '⚓' : k === 'gps' ? '📍' : '📌');

  return (
    <div className={`search ${picking ? 'picking' : ''}`}>
      <span className="search-label">{label}</span>
      <input
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value) onSelect(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) {
            onSelect(results[0]);
            setOpen(false);
          }
        }}
        aria-label={label}
      />
      {text && (
        <button className="icon-btn" title="Wissen" onClick={() => { setText(''); onSelect(null); }}>
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
          {loading && results.length === 0 && <li className="muted">Zoeken…</li>}
          {results.map((r, i) => (
            <li key={i} onMouseDown={() => { onSelect(r); setOpen(false); }}>
              {icon(r.kind)} <b>{r.name}</b> <small>{r.detail}</small>
            </li>
          ))}
          {!loading && text.trim().length >= 3 && results.length === 0 && <li className="muted">Niets gevonden. Tik op de kaart om een punt te kiezen.</li>}
        </ul>
      )}
    </div>
  );
}
