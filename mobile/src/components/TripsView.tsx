import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LatLng, Poi, Trip } from '@shared/types';
import type { Stage } from '@shared/trip';
import { formatDistance, formatDuration } from '@shared/geo';
import { POI_META, poiTitle } from '@shared/pois';
import { Btn, Card, H1, Muted, Row, Warn } from './ui';
import { C, T } from '../theme';
import { page } from './styles';

export function StagesList({ stages, onPoi, onFocus }: { stages: Stage[]; onPoi: (p: Poi) => void; onFocus: (p: LatLng) => void }) {
  const open = (p: Poi) => {
    onPoi(p);
    onFocus(p.p);
  };
  return (
    <View style={{ gap: 10 }}>
      {stages.map((s) => (
        <View key={s.day} style={st.stage}>
          <Row>
            <Text style={st.day}>Dag {s.day}</Text>
            <Text style={[T.label, { color: C.ink, flex: 1 }]}>{s.fromName} → {s.toName}</Text>
          </Row>
          <Muted>{s.startClock} tot {s.endClock} · {formatDistance(s.distance)} · {formatDuration(s.duration)} · {s.bridges} bruggen · {s.locks} sluizen</Muted>
          {s.stop && (
            <Pressable style={st.stop} onPress={() => open(s.stop!.poi)}>
              <Text style={[T.meta, { color: C.ink }]}>
                🛏️ Overnachten: <Text style={{ fontWeight: '700' }}>{poiTitle(s.stop.poi)}</Text> ({POI_META[s.stop.poi.k].label}{s.stop.poi.t.fee === 'no' ? ', gratis' : ''})
              </Text>
            </Pressable>
          )}
          {!s.stop && s.day < stages.length && <Warn level="soft">Geen haven of aanlegplaats gevonden binnen het dagbudget. Overweeg een langere dag of een tussenstop.</Warn>}
          {s.alternatives.length > 0 && (
            <Row wrap>
              <Muted>Ook mogelijk:</Muted>
              {s.alternatives.map((a) => (
                <Pressable key={a.poi.id} style={st.chip} onPress={() => open(a.poi)}>
                  <Text style={[T.meta, { color: C.ink }]}>{POI_META[a.poi.k].icon} {poiTitle(a.poi)}</Text>
                </Pressable>
              ))}
            </Row>
          )}
        </View>
      ))}
    </View>
  );
}

export default function TripsView({ trips, onOpen, onDelete, onNew }: { trips: Trip[]; onOpen: (t: Trip) => void; onDelete: (id: string) => void; onNew: () => void }) {
  return (
    <ScrollView contentContainerStyle={page.page}>
      <H1>Mijn tochten</H1>
      <Muted>Bewaarde routes met tussenpunten en dagindeling. Plan een route op de kaart en kies Bewaren.</Muted>
      <Btn kind="primary" title="+ Nieuwe tocht plannen" onPress={onNew} />
      {trips.length === 0 && <Muted>Nog geen tochten bewaard.</Muted>}
      {trips.map((t) => (
        <Card
          key={t.id}
          icon="🗺️"
          title={t.name}
          lines={[t.waypoints.map((w) => w.name).join(' → '), `${t.hoursPerDay} vaaruur per dag · vertrek ${t.startTime} · bewaard ${new Date(t.createdAt).toLocaleDateString('nl-NL')}`]}
        >
          <Row style={{ marginTop: 6 }}>
            <Btn small kind="primary" title="Openen" onPress={() => onOpen(t)} />
            <Btn small title="Wis" onPress={() => onDelete(t.id)} />
          </Row>
        </Card>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  stage: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: C.canvas },
  day: { ...T.micro, fontWeight: '700', color: '#fff', backgroundColor: C.lock, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  stop: { backgroundColor: '#fff', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: C.line },
  chip: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.line },
});
