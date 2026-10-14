import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { geocode, searchLocal, REMOTE_DELAY, type Place } from '@shared/geocode';
import { C, T } from '../theme';

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

  const choose = (fn: () => void) => {
    cancel();
    setLoading(false);
    fn();
    setOpen(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[st.box, picking && { borderColor: C.blue, backgroundColor: C.blueSoft }]}>
        <Text style={st.label}>{label}</Text>
        <TextInput
          style={st.input}
          value={text}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          onChangeText={(t) => {
            setText(t);
            setOpen(true);
            if (value) {
              // zelf typen wist de gekozen plek, maar niet wat je net typte
              setShown(null);
              onSelect(null);
            }
            search(t, REMOTE_DELAY);
          }}
          onFocus={() => {
            // een blur van eerder (bijvoorbeeld van het veld dat hier stond voor je een tussenpunt toevoegde) mag de lijst niet sluiten
            if (blurRef.current) clearTimeout(blurRef.current);
            setOpen(true);
          }}
          onBlur={() => {
            blurRef.current = setTimeout(() => setOpen(false), 200);
          }}
          onSubmitEditing={() => {
            if (results[0]) choose(() => onSelect(results[0]));
            else if (text.trim().length >= 3) search(text, 0);
          }}
          returnKeyType="search"
          accessibilityLabel={a11yName}
        />
        {text.length > 0 && (
          <Pressable hitSlop={10} onPress={() => { cancel(); setText(''); setResults([]); setLoading(false); onSelect(null); }} accessibilityRole="button" accessibilityLabel="Zoekveld wissen">
            <Text style={{ fontSize: 18, color: C.muted, paddingHorizontal: 6 }}>×</Text>
          </Pressable>
        )}
      </View>
      {open && (
        <View style={st.results}>
          {onUseGps && text.trim().length === 0 && (
            <Row onPress={() => choose(onUseGps)} icon="📍" title="Mijn locatie" sub="huidige GPS positie" />
          )}
          {onPickOnMap && text.trim().length === 0 && (
            <Row onPress={() => choose(onPickOnMap)} icon="🗺️" title="Kies op de kaart" sub="tik op een vaarweg" />
          )}
          {results.map((r, i) => (
            <Row key={`${r.name}:${i}`} onPress={() => choose(() => onSelect(r))} icon={icon(r.kind)} title={r.name} sub={r.detail} />
          ))}
          {loading && <Text style={st.muted}>Adressen zoeken…</Text>}
          {!loading && text.trim().length >= 3 && results.length === 0 && <Text style={st.muted}>Niets gevonden. Tik op de kaart om een punt te kiezen.</Text>}
        </View>
      )}
    </View>
  );
}

function Row({ icon: ic, title, sub, onPress }: { icon: string; title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [st.row, pressed && { backgroundColor: C.canvas }]}>
      <Text style={{ fontSize: 16 }}>{ic}</Text>
      <Text style={[T.body, { color: C.ink, flex: 1 }]} numberOfLines={1}>
        <Text style={{ fontWeight: '600' }}>{title}</Text> <Text style={[T.meta, { color: C.muted }]}>{sub}</Text>
      </Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingLeft: 8, minHeight: 44 },
  label: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, color: '#fff', textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  input: { flex: 1, fontSize: 15, color: C.ink, paddingHorizontal: 8, paddingVertical: 8 },
  results: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.line, marginTop: 4, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 44 },
  muted: { ...T.meta, color: C.muted, padding: 12 },
});
