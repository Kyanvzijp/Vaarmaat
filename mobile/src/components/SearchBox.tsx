import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { geocode, type Place } from '@shared/geocode';
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

  const choose = (fn: () => void) => {
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
            if (value) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onSubmitEditing={() => results[0] && choose(() => onSelect(results[0]))}
          returnKeyType="search"
          accessibilityLabel={label}
        />
        {text.length > 0 && (
          <Pressable hitSlop={10} onPress={() => { setText(''); onSelect(null); }} accessibilityLabel="Wissen">
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
          {loading && results.length === 0 && <Text style={st.muted}>Zoeken…</Text>}
          {results.map((r, i) => (
            <Row key={i} onPress={() => choose(() => onSelect(r))} icon={icon(r.kind)} title={r.name} sub={r.detail} />
          ))}
          {!loading && text.trim().length >= 3 && results.length === 0 && <Text style={st.muted}>Niets gevonden. Tik op de kaart om een punt te kiezen.</Text>}
        </View>
      )}
    </View>
  );
}

function Row({ icon: ic, title, sub, onPress }: { icon: string; title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.canvas }]}>
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
