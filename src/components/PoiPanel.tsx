import type { Poi } from '../types';
import { POI_META, poiFacts, poiTitle } from '../pois';
import { formatDistance } from '../geo';

export default function PoiPanel({ poi, dist, onClose, onRouteTo, onRouteFrom, fav, onFav }: { poi: Poi; dist?: number; onClose: () => void; onRouteTo: () => void; onRouteFrom: () => void; fav: boolean; onFav: () => void }) {
  const meta = POI_META[poi.k];
  const facts = poiFacts(poi);
  const forbidden = poi.k === 'no_mooring' || poi.k === 'no_anchor' || poi.k === 'restricted';
  return (
    <div className="sheet poi">
      <div className="sheet-head">
        <div>
          <h2>{meta.icon} {poiTitle(poi)}</h2>
          <p className="muted small">{meta.label}{dist != null ? ` · ${formatDistance(dist)} van je positie` : ''}</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Sluiten">×</button>
      </div>
      {forbidden && <div className="warn">Hier mag je niet {poi.k === 'no_anchor' ? 'ankeren' : poi.k === 'no_mooring' ? 'afmeren' : 'zomaar varen of liggen'}. Kijk naar de borden ter plaatse.</div>}
      {facts.length > 0 ? (
        <dl className="facts">
          {facts.map((f, i) => (
            <span key={i} className="fact">
              <dt>{f.label}</dt>
              <dd>{f.label === 'Website' ? <a href={f.value.startsWith('http') ? f.value : `https://${f.value}`} target="_blank" rel="noreferrer">{f.value.replace(/^https?:\/\//, '')}</a> : f.label === 'Telefoon' ? <a href={`tel:${f.value.replace(/\s/g, '')}`}>{f.value}</a> : f.value}</dd>
            </span>
          ))}
        </dl>
      ) : (
        !forbidden && <p className="muted small">Geen extra gegevens bekend in OpenStreetMap. Bel of kijk ter plaatse voor liggeld en voorzieningen.</p>
      )}
      {!forbidden && (
        <div className="actions">
          <button className="primary" onClick={onRouteTo}>Vaar hierheen</button>
          <button onClick={onRouteFrom}>Vertrek hier</button>
          <button onClick={onFav} title="Favoriet">{fav ? '★' : '☆'}</button>
        </div>
      )}
      <p className="muted small">Positie {poi.p[0].toFixed(5)}, {poi.p[1].toFixed(5)}</p>
    </div>
  );
}
