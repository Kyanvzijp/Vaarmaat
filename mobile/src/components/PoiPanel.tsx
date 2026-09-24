import { Linking, Text } from 'react-native';
import type { Poi } from '@shared/types';
import { POI_META, poiFacts, poiTitle } from '@shared/pois';
import { formatDistance } from '@shared/geo';
import { Btn, Fact, Muted, Row, Sheet, SheetHead, Warn } from './ui';
import { C, T } from '../theme';

export default function PoiPanel({ poi, dist, onClose, onRouteTo, onRouteFrom, fav, onFav, bottom }: { poi: Poi; dist?: number; onClose: () => void; onRouteTo: () => void; onRouteFrom: () => void; fav: boolean; onFav: () => void; bottom: number }) {
  const meta = POI_META[poi.k];
  const facts = poiFacts(poi);
  const forbidden = poi.k === 'no_mooring' || poi.k === 'no_anchor' || poi.k === 'restricted';
  const link = (label: string, value: string) => {
    if (label === 'Website') return <Text style={[T.meta, { color: C.blue }]} onPress={() => Linking.openURL(value.startsWith('http') ? value : `https://${value}`)}>{value.replace(/^https?:\/\//, '')}</Text>;
    if (label === 'Telefoon') return <Text style={[T.meta, { color: C.blue }]} onPress={() => Linking.openURL(`tel:${value.replace(/\s/g, '')}`)}>{value}</Text>;
    return value;
  };
  return (
    <Sheet expanded bottom={bottom}>
      <SheetHead title={`${meta.icon} ${poiTitle(poi)}`} sub={`${meta.label}${dist != null ? ` · ${formatDistance(dist)} van je positie` : ''}`} onClose={onClose} />
      {forbidden && <Warn level="err">Hier mag je niet {poi.k === 'no_anchor' ? 'ankeren' : poi.k === 'no_mooring' ? 'afmeren' : 'zomaar varen of liggen'}. Kijk naar de borden ter plaatse.</Warn>}
      {facts.length > 0
        ? facts.map((f, i) => <Fact key={i} label={f.label}>{link(f.label, f.value)}</Fact>)
        : !forbidden && <Muted>Geen extra gegevens bekend in OpenStreetMap. Bel of kijk ter plaatse voor liggeld en voorzieningen.</Muted>}
      {!forbidden && (
        <Row>
          <Btn kind="primary" title="Vaar hierheen" onPress={onRouteTo} flex />
          <Btn title="Vertrek hier" onPress={onRouteFrom} />
          <Btn title={fav ? '★' : '☆'} onPress={onFav} />
        </Row>
      )}
      <Muted>Positie {poi.p[0].toFixed(5)}, {poi.p[1].toFixed(5)}</Muted>
    </Sheet>
  );
}
