import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CHECKLISTS } from '@shared/content/lessons';
import { loadChecks, saveChecks, loadLogs, saveLogs, type Settings } from '@shared/store';
import type { BoatProfile, LatLng, LogEntry } from '@shared/types';
import { formatDistance, formatDuration, formatSpeed } from '@shared/geo';
import WeatherCard from './WeatherCard';
import { Btn, Card, Chip, H1, Muted, NumField, P, Row, TextField, Toggle } from './ui';
import { page } from './styles';
import { C, T } from '../theme';

function gpx(l: LogEntry): string {
  const pts = l.track.map((p) => `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Vaarmaat" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${l.from} naar ${l.to} (${l.date})</name><trkseg>\n${pts}\n</trkseg></trk></gpx>`;
}

export function Checklists() {
  const [checks, setChecks] = useState<Record<string, boolean>>(loadChecks);
  const [open, setOpen] = useState<string | null>(null);
  const update = (c: Record<string, boolean>) => {
    setChecks(c);
    saveChecks(c);
  };
  const reset = (id: string) => {
    const c = { ...checks };
    for (const k of Object.keys(c)) if (k.startsWith(id + ':')) delete c[k];
    update(c);
  };
  return (
    <View style={{ gap: 8 }}>
      {CHECKLISTS.map((cl) => {
        const done = cl.items.filter((_, i) => checks[`${cl.id}:${i}`]).length;
        const isOpen = open === cl.id;
        return (
          <View key={cl.id} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: '#fff' }}>
            <Pressable onPress={() => setOpen(isOpen ? null : cl.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, minHeight: 44 }}>
              <Text style={[T.label, { fontSize: 15, color: C.ink, flex: 1 }]}>{cl.icon} {cl.title}</Text>
              <Text style={[T.meta, { color: done === cl.items.length ? C.ok : C.muted, fontWeight: '600' }]}>{done}/{cl.items.length} {isOpen ? '▴' : '▾'}</Text>
            </Pressable>
            {isOpen && (
              <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                {cl.items.map((it, i) => (
                  <Toggle key={i} label={it} value={!!checks[`${cl.id}:${i}`]} onChange={() => update({ ...checks, [`${cl.id}:${i}`]: !checks[`${cl.id}:${i}`] })} />
                ))}
                <Btn small title="Lijst leegmaken" onPress={() => reset(cl.id)} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export function Logbook() {
  const [logs, setLogs] = useState<LogEntry[]>(loadLogs);
  const remove = (id: string) => {
    const l = logs.filter((x) => x.id !== id);
    setLogs(l);
    saveLogs(l);
  };
  const share = async (l: LogEntry) => {
    try {
      const f = new File(Paths.cache, `vaarmaat-${l.date.slice(0, 10)}-${l.id}.gpx`);
      f.create({ overwrite: true });
      f.write(gpx(l));
      await Sharing.shareAsync(f.uri, { mimeType: 'application/gpx+xml', UTI: 'com.topografix.gpx', dialogTitle: 'GPX delen' });
    } catch (e) {
      Alert.alert('Delen lukt niet', (e as Error).message);
    }
  };
  const total = logs.reduce((a, l) => a + l.distance, 0);
  const hours = logs.reduce((a, l) => a + l.duration, 0);
  if (logs.length === 0) return <Muted>Nog geen tochten in het logboek. Start navigatie en je tocht wordt automatisch vastgelegd: afstand, tijd, gemiddelde en topsnelheid en het gevaren spoor.</Muted>;
  return (
    <View style={{ gap: 8 }}>
      <P style={{ fontSize: 14 }}>Totaal {formatDistance(total)} in {formatDuration(hours)} over {logs.length} tocht{logs.length === 1 ? '' : 'en'}.</P>
      {logs.map((l) => (
        <Card
          key={l.id}
          icon="📒"
          title={`${l.from} → ${l.to}`}
          lines={[`${formatDistance(l.distance)} · ${formatDuration(l.duration)} · gem. ${formatSpeed(l.avgSpeed)} · max ${formatSpeed(l.maxSpeed)}`, new Date(l.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })]}
        >
          <Row style={{ marginTop: 6 }}>
            <Btn small title="GPX delen" onPress={() => share(l)} />
            <Btn small title="Wis" onPress={() => remove(l.id)} />
          </Row>
        </Card>
      ))}
    </View>
  );
}

interface Props {
  settings: Settings;
  onSettings: (s: Settings) => void;
  profile: BoatProfile;
  onEditProfile: () => void;
  weatherPoint: LatLng | null;
}

type Sub = 'weer' | 'check' | 'log' | 'inst';

export default function MoreView({ settings, onSettings, profile, onEditProfile, weatherPoint }: Props) {
  const [tab, setTab] = useState<Sub>('weer');
  // vertrektijd pas opslaan als hij geldig is, zodat de dagindeling nooit met een halve tijd rekent
  const [time, setTime] = useState(settings.startTime);
  return (
    <ScrollView contentContainerStyle={page.page} keyboardShouldPersistTaps="handled">
      <H1>Aan boord</H1>
      <Row wrap>
        {([['weer', '🌤️ Weer'], ['check', '✅ Checklists'], ['log', '📒 Logboek'], ['inst', '⚙️ Instellingen']] as [Sub, string][]).map(([id, label]) => (
          <Chip key={id} dark active={tab === id} title={label} onPress={() => setTab(id)} />
        ))}
      </Row>
      {tab === 'weer' && <WeatherCard point={weatherPoint} label="Weer en wind" />}
      {tab === 'check' && <Checklists />}
      {tab === 'log' && <Logbook />}
      {tab === 'inst' && (
        <View style={{ gap: 12 }}>
          <Card icon="🛥️" title={profile.name} lines={[`hoogte ${profile.height.toFixed(2).replace('.', ',')} m · diepgang ${profile.draft.toFixed(2).replace('.', ',')} m · ${profile.speed} km/u`]} onPress={onEditProfile} />
          <Toggle label="Gesproken instructies tijdens navigatie" value={settings.voice} onChange={(v) => onSettings({ ...settings, voice: v })} />
          <Toggle label="Havens, aanlegplaatsen en voorzieningen op de kaart tonen" value={settings.showPois} onChange={(v) => onSettings({ ...settings, showPois: v })} />
          <NumField integer label="Voorbereiding op sluis of brug tonen vanaf" value={settings.prepMinutes} min={5} max={60} unit="min van tevoren" onChange={(v) => onSettings({ ...settings, prepMinutes: v || 20 })} />
          <NumField label="Vaaruren per dag (tochtplanner)" value={settings.hoursPerDay} min={1} max={14} unit="uur" onChange={(v) => onSettings({ ...settings, hoursPerDay: v || 5 })} />
          <TextField
            label="Standaard vertrektijd (uu:mm)"
            value={time}
            onChange={(v) => {
              setTime(v);
              const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
              if (m && +m[1] < 24 && +m[2] < 60) onSettings({ ...settings, startTime: `${m[1].padStart(2, '0')}:${m[2]}` });
            }}
            placeholder="10:00"
          />
          <View style={{ gap: 6 }}>
            <Text style={[T.label, { color: C.ink }]}>Over Vaarmaat</Text>
            <Muted>Vaarwegen, bruggen, sluizen, havens en aanlegplaatsen: © OpenStreetMap bijdragers (ODbL). Zeekaartsymbolen: OpenSeaMap. Weer: Open-Meteo. Regelkennis op basis van het Binnenvaartpolitiereglement en Varen doe je Samen.</Muted>
            <Muted>Doorvaarthoogtes en bedieningstijden kunnen afwijken van de werkelijkheid. Controleer altijd ter plaatse en volg aanwijzingen van brug- en sluiswachters. De app is een hulpmiddel, de schipper blijft verantwoordelijk.</Muted>
            <Muted>Routes, uitleg, checklists en havens werken offline; alleen de kaarttegels en het weer hebben internet nodig.</Muted>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
