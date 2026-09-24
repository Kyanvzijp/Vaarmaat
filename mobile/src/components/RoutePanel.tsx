import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BoatProfile, LandLeg, LatLng, Poi, RouteResult, RouteStep } from '@shared/types';
import { directionsUrl, type TravelMode } from '@shared/lastmile';
import { formatDistance, formatDuration, formatHeight } from '@shared/geo';
import type { Stage } from '@shared/trip';
import { POI_META, poiTitle } from '@shared/pois';
import { StagesList } from './TripsView';
import WeatherCard from './WeatherCard';
import { OpsFacts } from './ApproachCard';
import { Btn, Card, Chip, Muted, NumField, P, Row, Sheet, SheetHead, Toggle, Warn } from './ui';
import { C, T } from '../theme';
import { STEP_ICONS } from '../stepIcons';

export type RouteTab = 'route' | 'stappen' | 'tocht' | 'aanleggen' | 'weer';

interface Props {
  routes: RouteResult[];
  selected: number;
  profile: BoatProfile;
  onSelect: (i: number) => void;
  onStart: () => void;
  onStepClick: (s: RouteStep) => void;
  onClose: () => void;
  expanded: boolean;
  onToggle: () => void;
  stages: Stage[];
  multiDay: boolean;
  onMultiDay: (v: boolean) => void;
  hoursPerDay: number;
  onHours: (h: number) => void;
  onSaveTrip: () => void;
  destPois: { poi: Poi; dist: number }[];
  onPoi: (p: Poi) => void;
  onFocus: (p: LatLng) => void;
  weatherPoint: LatLng | null;
  tab: RouteTab;
  onTab: (t: RouteTab) => void;
  bottom: number;
}

const MODES: [TravelMode, string][] = [
  ['lopen', 'Lopen'],
  ['auto', 'Auto'],
  ['ov', 'OV'],
];

/** Stuk over land tussen het gekozen punt en het water, met links naar een routeplanner */
export function AccessCard({ leg, kind }: { leg: LandLeg; kind: 'start' | 'end' }) {
  const from = kind === 'start' ? leg.point : leg.water;
  const to = kind === 'start' ? leg.water : leg.point;
  const text =
    kind === 'start'
      ? `${leg.name} ligt ${formatDistance(leg.distance)} van het water. Eerst naar de vaarweg: ongeveer ${formatDuration(leg.walkTime)} lopen.`
      : `${leg.name} ligt ${formatDistance(leg.distance)} van het water. Vanaf de aanlegplek nog ongeveer ${formatDuration(leg.walkTime)} lopen.`;
  return (
    <View style={st.access}>
      <Text style={{ fontSize: 20 }}>🚶</Text>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[T.meta, { color: C.ink }]}>{text}</Text>
        <Row wrap>
          {MODES.map(([mode, label]) => (
            <Btn key={mode} small title={label} onPress={() => Linking.openURL(directionsUrl(from, to, mode))} />
          ))}
          {Platform.OS === 'ios' && <Btn small title="Apple Kaarten" onPress={() => Linking.openURL(directionsUrl(from, to, 'lopen', 'apple'))} />}
        </Row>
      </View>
    </View>
  );
}

function StepIcon({ kind }: { kind: RouteStep['kind'] }) {
  const bg = kind === 'lock' ? '#f1e6ff' : kind === 'bridge' || kind === 'movable_bridge' ? C.warnBg : C.blueSoft;
  return (
    <View style={[st.stepIcon, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 15 }}>{STEP_ICONS[kind]}</Text>
    </View>
  );
}

export default function RoutePanel(p: Props) {
  const { routes, selected, profile } = p;
  const r = routes[selected];
  if (!r) return null;
  const arrivalStr = new Date(Date.now() + r.duration * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const fits = r.lowestBridge == null || r.lowestBridge >= profile.height + profile.margin;
  const long = r.duration > p.hoursPerDay * 3600;
  const opsSteps = r.steps.filter((s) => s.kind === 'movable_bridge' || s.kind === 'lock');
  const tabLabel = (t: RouteTab) =>
    t === 'route' ? 'Route' : t === 'stappen' ? `Afslagen (${r.steps.length})` : t === 'tocht' ? (long ? `Dagindeling (${Math.max(1, p.stages.length)})` : 'Tocht') : t === 'aanleggen' ? 'Aanleggen' : 'Weer';

  return (
    <Sheet expanded={p.expanded} onToggle={p.onToggle} bottom={p.bottom}>
      <SheetHead
        title={
          <Text style={[T.h1, { color: C.ink }]}>
            {formatDuration(r.duration)} <Text style={{ color: C.muted, fontWeight: '400' }}>({formatDistance(r.distance)})</Text>
          </Text>
        }
        sub={`${long ? `${Math.ceil(r.duration / 3600 / p.hoursPerDay)} dagen bij ${p.hoursPerDay} u/dag` : `Aankomst rond ${arrivalStr}`} bij ${profile.speed} km/u${r.waitTime >= 300 ? ` · waarvan ${formatDuration(r.waitTime)} wachten` : ''} · ${r.bridges.length} bruggen · ${r.locks.length} sluizen${r.lowestBridge != null ? ` · laagste brug ${formatHeight(r.lowestBridge)}` : ''}`}
        onClose={p.onClose}
      />
      {routes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {routes.map((alt, i) => (
            <Pressable key={alt.id} onPress={() => p.onSelect(i)} style={[st.alt, i === selected && st.altActive]}>
              <Text style={[T.label, { color: i === selected ? C.blueDark : C.ink }]}>{alt.label}</Text>
              <Text style={[T.meta, { color: C.ink }]}>{formatDuration(alt.duration)} · {formatDistance(alt.distance)}</Text>
              <Muted>{alt.bridges.length} bruggen{alt.lowestBridge != null ? ` · min ${formatHeight(alt.lowestBridge)}` : ''}</Muted>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {!fits && <Warn>Let op: op deze route zit een brug lager dan je boot; die moet open.</Warn>}
      {r.warnings.map((w, i) => (
        <Warn key={i} level="soft">{w}</Warn>
      ))}
      {r.access?.start && <AccessCard leg={r.access.start} kind="start" />}
      {r.access?.end && <AccessCard leg={r.access.end} kind="end" />}
      <Row>
        <Btn kind="primary" title="▶ Start navigatie" onPress={p.onStart} flex />
        <Btn title="💾 Bewaren" onPress={p.onSaveTrip} />
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {(['route', 'stappen', 'tocht', 'aanleggen', 'weer'] as const).map((t) => (
          <Chip key={t} dark active={p.tab === t} title={tabLabel(t)} onPress={() => { p.onTab(t); if (!p.expanded) p.onToggle(); }} />
        ))}
      </ScrollView>

      {p.tab === 'route' && (
        <View style={{ gap: 8 }}>
          {r.waterways.length > 0 && <P style={{ fontSize: 14 }}>Via {r.waterways.join(' → ')}</P>}
          {opsSteps.length > 0 && <Text style={[T.label, { color: C.ink }]}>Beweegbare bruggen en sluizen op de route</Text>}
          {opsSteps.map((s, i) => {
            const obj = s.kind === 'lock' ? r.locks.find((l) => Math.abs(l.at - s.at) < 1) : r.bridges.find((b) => Math.abs(b.at - s.at) < 1);
            return (
              <Pressable key={i} style={st.step} onPress={() => p.onStepClick(s)}>
                <StepIcon kind={s.kind} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[T.label, { color: C.ink }]}>{s.text.replace('Wacht op opening ', '').replace('Schut door ', '')}</Text>
                  <Muted>{formatDistance(s.at)}{s.detail ? ` · ${s.detail}` : ''}</Muted>
                  <OpsFacts ops={obj?.ops} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {p.tab === 'stappen' &&
        r.steps.map((s, i) => (
          <Pressable key={i} style={st.step} onPress={() => p.onStepClick(s)}>
            <StepIcon kind={s.kind} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[T.label, { fontSize: 14, color: C.ink }]}>{s.text}</Text>
              {s.detail && <Text style={[T.meta, { color: C.ink }]}>{s.detail}</Text>}
              {s.kind !== 'arrive' && <Muted>daarna {formatDistance(s.dist)}</Muted>}
            </View>
            <Muted>{formatDistance(s.at)}</Muted>
          </Pressable>
        ))}

      {p.tab === 'tocht' && (
        <View style={{ gap: 10 }}>
          <Toggle label="Verdeel in dagetappes met overnachtingen" value={p.multiDay} onChange={p.onMultiDay} />
          <NumField label="Vaaruren per dag" value={p.hoursPerDay} min={1} max={14} unit="uur" onChange={(v) => p.onHours(v || 5)} />
          {p.multiDay ? (
            <StagesList stages={p.stages} onPoi={p.onPoi} onFocus={p.onFocus} />
          ) : (
            <Muted>Zet de dagindeling aan om de route op te knippen in etappes met een voorstel voor jachthavens of aanlegplaatsen om te overnachten.</Muted>
          )}
        </View>
      )}

      {p.tab === 'aanleggen' && (
        <View style={{ gap: 8 }}>
          <P style={{ fontSize: 14 }}>Aanleggen in de buurt van je bestemming:</P>
          {p.destPois.length === 0 && <Muted>Geen jachthaven of aanlegplaats bekend binnen 2,5 km. Kijk op de kaart of kies een andere bestemming.</Muted>}
          {p.destPois.map(({ poi, dist }) => (
            <Card
              key={poi.id}
              icon={POI_META[poi.k].icon}
              iconColor={POI_META[poi.k].color}
              title={poiTitle(poi)}
              lines={[`${POI_META[poi.k].label} · ${formatDistance(dist)} van de bestemming${poi.t.fee === 'no' ? ' · gratis' : poi.t.fee === 'yes' ? ' · liggeld' : ''}${poi.t.maxstay ? ` · max ${poi.t.maxstay}` : ''}`]}
              onPress={() => { p.onPoi(poi); p.onFocus(poi.p); }}
            />
          ))}
        </View>
      )}

      {p.tab === 'weer' && <WeatherCard point={p.weatherPoint} label="Weer bij vertrek" compact />}
    </Sheet>
  );
}

const st = StyleSheet.create({
  access: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 12, backgroundColor: C.canvas },
  alt: { padding: 10, borderRadius: 12, backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, minWidth: 140, gap: 2 },
  altActive: { backgroundColor: C.blueSoft, borderColor: C.blue },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  stepIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
